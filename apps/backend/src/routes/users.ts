import bcrypt from "bcryptjs";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { getOrSetJson, invalidateCrmCache } from "../services/cache";
import type { BaileysSessionManager } from "../services/baileys/session-manager";
import { enqueuePhoneMessage } from "../services/message-queue";

const sendTeammateMessageSchema = z.object({
  message: z.string().min(1).max(4000),
});

const teamMessageSelect = {
  id: true,
  senderUserId: true,
  recipientUserId: true,
  content: true,
  createdAt: true,
} as const;

const createUserSchema = z.object({
  name: z.string().max(120),
  email: z.string().email(),
  phone: z.string().min(5).optional().or(z.literal("")),
  profileImageUrl: z.string().max(2_000_000).optional().or(z.literal("")),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  assignments: z
    .array(
      z.object({
        departmentName: z.string().min(1).max(120),
        positionTitle: z.string().min(1).max(120),
      }),
    )
    .optional()
    .default([]),
});

const updateUserSchema = z.object({
  name: z.string().max(120),
  email: z.string().email(),
  phone: z.string().min(5).optional().or(z.literal("")),
  profileImageUrl: z.string().max(2_000_000).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "USER"]),
  timeZone: z.string().min(2),
  currency: z.string().min(2),
  briefingTime: z.string().regex(/^\d{2}:\d{2}$/),
  firstReminderMinutes: z.number().int().min(1).max(1440),
  secondReminderMinutes: z.number().int().min(1).max(1440),
  assignments: z.array(
    z.object({
      departmentName: z.string().min(1).max(120),
      positionTitle: z.string().min(1).max(120),
    }),
  ),
});

const updateSettingsSchema = z.object({
  timeZone: z.string().min(2),
  currency: z.string().min(2),
  language: z.string().min(2).optional(),
  briefingTime: z.string().regex(/^\d{2}:\d{2}$/),
  firstReminderMinutes: z.number().int().min(1).max(1440),
  secondReminderMinutes: z.number().int().min(1).max(1440),
});

const updateSmtpSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().int().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUsername: z.string().min(1),
  smtpPassword: z.string().min(1),
  smtpFromEmail: z.string().email(),
  smtpFromName: z.string().min(1),
});

const REQUIRED_KANBAN_STAGE_IDS = [
  "NEW",
  "COLD",
  "WARM",
  "HOT",
  "DEAD",
  "CUSTOMER",
] as const;

const DEFAULT_ACTION_FOLLOW_UP_OPTIONS = [
  { id: "COMPLETED", title: "Completed" },
  { id: "INCOMPLETE", title: "Incomplete" },
  { id: "CLIENT_BUSY", title: "Client Was Busy" },
  { id: "NO_RESPONSE", title: "Client Didn't Respond" },
  { id: "CALL_BACK_ANOTHER_DAY", title: "Ask to Call Back Another Day" },
  { id: "EMAIL_SENT", title: "Send an Email" },
] as const;

const kanbanStageSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/).min(2).max(40),
  title: z.string().min(1).max(40),
});

const updateKanbanSettingsSchema = z.object({
  stages: z
    .array(kanbanStageSchema)
    .min(REQUIRED_KANBAN_STAGE_IDS.length)
    .refine(
      (stages) =>
        REQUIRED_KANBAN_STAGE_IDS.every((id) =>
          stages.some((stage) => stage.id === id),
        ),
      { message: "All kanban stages are required" },
    )
    .refine(
      (stages) => new Set(stages.map((stage) => stage.id)).size === stages.length,
      { message: "Kanban stage ids must be unique" },
    ),
});

const actionFollowUpOptionSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/).min(2).max(60),
  title: z.string().min(1).max(80),
});

const updateActionFollowUpSettingsSchema = z.object({
  options: z
    .array(actionFollowUpOptionSchema)
    .min(1)
    .refine(
      (options) => new Set(options.map((option) => option.id)).size === options.length,
      { message: "Action follow-up ids must be unique" },
    ),
});

const departmentSettingSchema = z.object({
  name: z.string().min(1).max(120),
  positions: z.array(z.string().min(1).max(120)).default([]),
});

const updateDepartmentSettingsSchema = z.object({
  departments: z.array(departmentSettingSchema),
});

function normalizeKanbanStages(raw: Array<{ id: string; title: string }>) {
  const unique = new Map<string, { id: string; title: string }>();

  for (const stage of raw) {
    const normalizedId = stage.id.toUpperCase();

    if (!/^[A-Z0-9_]+$/.test(normalizedId)) {
      continue;
    }

    if (!unique.has(normalizedId)) {
      unique.set(normalizedId, {
        id: normalizedId,
        title: stage.title.trim() || normalizedId,
      });
    }
  }

  for (const id of REQUIRED_KANBAN_STAGE_IDS) {
    if (!unique.has(id)) {
      unique.set(id, { id, title: id.charAt(0) + id.slice(1).toLowerCase() });
    }
  }

  const orderedRequired = REQUIRED_KANBAN_STAGE_IDS.map((id) => unique.get(id)!);
  const customStages = Array.from(unique.values()).filter(
    (stage) => !REQUIRED_KANBAN_STAGE_IDS.includes(stage.id as (typeof REQUIRED_KANBAN_STAGE_IDS)[number]),
  );

  return [...orderedRequired, ...customStages];
}

function normalizeActionFollowUpOptions(raw: Array<{ id: string; title: string }>) {
  const unique = new Map<string, { id: string; title: string }>();

  for (const option of raw) {
    const normalizedId = option.id.toUpperCase().trim();

    if (!/^[A-Z0-9_]+$/.test(normalizedId)) {
      continue;
    }

    if (!unique.has(normalizedId)) {
      unique.set(normalizedId, {
        id: normalizedId,
        title: option.title.trim() || normalizedId,
      });
    }
  }

  return unique.size ? Array.from(unique.values()) : [...DEFAULT_ACTION_FOLLOW_UP_OPTIONS];
}

async function findGlobalSmtpOwnerId(fallbackAdminId: number) {
  const globalOwner = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return globalOwner?.id ?? fallbackAdminId;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  profileImageUrl: true,
  role: true,
  whatsappConnected: true,
  needsReauth: true,
  timeZone: true,
  currency: true,
  language: true,
  briefingTime: true,
  firstReminderMinutes: true,
  secondReminderMinutes: true,
  createdAt: true,
  updatedAt: true,
  departmentAssignments: {
    include: {
      department: {
        select: { id: true, name: true },
      },
      position: {
        select: { id: true, title: true },
      },
    },
  },
};

async function upsertUserAssignments(
  tx: Prisma.TransactionClient,
  userId: number,
  assignments: Array<{ departmentName: string; positionTitle: string }>,
) {
  const normalized = Array.from(
    new Map(
      assignments.map((assignment) => [
        `${assignment.departmentName.trim().toLowerCase()}::${assignment.positionTitle.trim().toLowerCase()}`,
        {
          departmentName: assignment.departmentName.trim(),
          positionTitle: assignment.positionTitle.trim(),
        },
      ]),
    ).values(),
  ).filter((assignment) => assignment.departmentName && assignment.positionTitle);

  await tx.userDepartmentPosition.deleteMany({
    where: { userId },
  });

  for (const assignment of normalized) {
    const department = await tx.department.findUnique({
      where: { name: assignment.departmentName },
    });

    if (!department) {
      throw new Error(`Department "${assignment.departmentName}" is not configured yet.`);
    }

    const position = await tx.position.findUnique({
      where: {
        departmentId_title: {
          departmentId: department.id,
          title: assignment.positionTitle,
        },
      },
    });

    if (!position) {
      throw new Error(
        `Position "${assignment.positionTitle}" is not configured in "${assignment.departmentName}".`,
      );
    }

    await tx.userDepartmentPosition.create({
      data: {
        userId,
        departmentId: department.id,
        positionId: position.id,
      },
    });
  }
}

export function createUsersRouter(sessionManager: BaileysSessionManager) {
const usersRouter = Router();

usersRouter.get("/", requireAuth, async (req, res) => {
  const cacheKey = `users:list:${req.auth!.role}:${req.auth!.id}`;
  const users = await getOrSetJson(cacheKey, async () =>
    prisma.user.findMany({
      where: req.auth?.role === "ADMIN" ? {} : { id: { not: req.auth!.id } },
      select: userSelect,
      orderBy: {
        email: "asc",
      },
    }),
  );

  return res.json({ users });
});

usersRouter.get("/organization-options", requireAuth, async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      positions: {
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return res.json({ departments });
});

usersRouter.get("/department-settings", requireAuth, requireAdmin, async (_req, res) => {
  const departments = await prisma.department.findMany({
    include: {
      positions: {
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return res.json({
    departments: departments.map((department) => ({
      name: department.name,
      positions: department.positions.map((position) => position.title),
    })),
  });
});

usersRouter.patch("/department-settings", requireAuth, requireAdmin, async (req, res) => {
  const payload = updateDepartmentSettingsSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid department settings payload" });
  }

  const normalizedDepartments = Array.from(
    new Map(
      payload.data.departments.map((department) => [
        department.name.trim().toLowerCase(),
        {
          name: department.name.trim(),
          positions: Array.from(
            new Set(
              department.positions
                .map((position) => position.trim())
                .filter(Boolean),
            ),
          ),
        },
      ]),
    ).values(),
  ).filter((department) => department.name);

  await prisma.$transaction(async (tx) => {
    const existingDepartments = await tx.department.findMany({
      include: { positions: true },
    });

    const keepDepartmentNames = new Set(
      normalizedDepartments.map((department) => department.name),
    );

    for (const existingDepartment of existingDepartments) {
      if (!keepDepartmentNames.has(existingDepartment.name)) {
        await tx.userDepartmentPosition.deleteMany({
          where: { departmentId: existingDepartment.id },
        });
        await tx.position.deleteMany({
          where: { departmentId: existingDepartment.id },
        });
        await tx.department.delete({
          where: { id: existingDepartment.id },
        });
      }
    }

    for (const departmentInput of normalizedDepartments) {
      const department = await tx.department.upsert({
        where: { name: departmentInput.name },
        update: { name: departmentInput.name },
        create: { name: departmentInput.name },
      });

      const keepPositionTitles = departmentInput.positions;

      await tx.userDepartmentPosition.deleteMany({
        where: {
          departmentId: department.id,
          position: {
            title: keepPositionTitles.length
              ? { notIn: keepPositionTitles }
              : undefined,
          },
        },
      });

      await tx.position.deleteMany({
        where: {
          departmentId: department.id,
          title: keepPositionTitles.length
            ? { notIn: keepPositionTitles }
            : undefined,
        },
      });

      for (const positionTitle of keepPositionTitles) {
        await tx.position.upsert({
          where: {
            departmentId_title: {
              departmentId: department.id,
              title: positionTitle,
            },
          },
          update: { title: positionTitle },
          create: {
            departmentId: department.id,
            title: positionTitle,
          },
        });
      }
    }
  });

  await invalidateCrmCache();

  const departments = await prisma.department.findMany({
    include: {
      positions: {
        orderBy: { title: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return res.json({
    departments: departments.map((department) => ({
      name: department.name,
      positions: department.positions.map((position) => position.title),
    })),
  });
});

usersRouter.patch("/settings", requireAuth, async (req, res) => {
  const payload = updateSettingsSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid settings payload" });
  }

  if (payload.data.firstReminderMinutes <= payload.data.secondReminderMinutes) {
    return res.status(400).json({
      message: "The first reminder must be earlier than the second reminder.",
    });
  }

  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.id },
    select: { language: true, briefingTime: true, timeZone: true },
  });

  const shouldResetBriefingMarker =
    payload.data.briefingTime !== currentUser.briefingTime ||
    payload.data.timeZone !== currentUser.timeZone;

  const user = await prisma.user.update({
    where: { id: req.auth!.id },
    data: {
      ...payload.data,
      language: payload.data.language ?? currentUser.language,
      lastBriefSentAt: shouldResetBriefingMarker ? null : undefined,
    },
    select: userSelect,
  });

  await invalidateCrmCache();

  return res.json({ user });
});

usersRouter.get("/smtp-settings", requireAuth, requireAdmin, async (req, res) => {
  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const smtp = await prisma.user.findUniqueOrThrow({
    where: { id: ownerId },
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUsername: true,
      smtpPassword: true,
      smtpFromEmail: true,
      smtpFromName: true,
    },
  });

  return res.json({ smtp });
});

usersRouter.patch("/smtp-settings", requireAuth, requireAdmin, async (req, res) => {
  const payload = updateSmtpSettingsSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid SMTP settings payload" });
  }

  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const smtp = await prisma.user.update({
    where: { id: ownerId },
    data: payload.data,
    select: {
      smtpHost: true,
      smtpPort: true,
      smtpSecure: true,
      smtpUsername: true,
      smtpPassword: true,
      smtpFromEmail: true,
      smtpFromName: true,
    },
  });

  await invalidateCrmCache();

  return res.json({ smtp });
});

usersRouter.get("/kanban-settings", requireAuth, async (req, res) => {
  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const owner = await prisma.user.findUniqueOrThrow({
    where: { id: ownerId },
    select: { kanbanStagesJson: true },
  });

  const stages = normalizeKanbanStages(JSON.parse(owner.kanbanStagesJson));
  return res.json({ stages });
});

usersRouter.patch("/kanban-settings", requireAuth, requireAdmin, async (req, res) => {
  const payload = updateKanbanSettingsSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid kanban settings payload" });
  }

  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const owner = await prisma.user.update({
    where: { id: ownerId },
    data: {
      kanbanStagesJson: JSON.stringify(normalizeKanbanStages(payload.data.stages)),
    },
    select: { kanbanStagesJson: true },
  });

  await invalidateCrmCache();

  return res.json({ stages: normalizeKanbanStages(JSON.parse(owner.kanbanStagesJson)) });
});

usersRouter.get("/action-follow-up-settings", requireAuth, async (req, res) => {
  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const owner = await prisma.user.findUniqueOrThrow({
    where: { id: ownerId },
    select: { actionFollowUpOptionsJson: true },
  });

  return res.json({
    options: normalizeActionFollowUpOptions(JSON.parse(owner.actionFollowUpOptionsJson)),
  });
});

usersRouter.patch("/action-follow-up-settings", requireAuth, requireAdmin, async (req, res) => {
  const payload = updateActionFollowUpSettingsSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid action follow-up settings payload" });
  }

  const ownerId = await findGlobalSmtpOwnerId(req.auth!.id);

  const owner = await prisma.user.update({
    where: { id: ownerId },
    data: {
      actionFollowUpOptionsJson: JSON.stringify(
        normalizeActionFollowUpOptions(payload.data.options),
      ),
    },
    select: { actionFollowUpOptionsJson: true },
  });

  await invalidateCrmCache();

  return res.json({
    options: normalizeActionFollowUpOptions(JSON.parse(owner.actionFollowUpOptionsJson)),
  });
});

usersRouter.post("/:id/message", requireAuth, async (req, res) => {
  const payload = sendTeammateMessageSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid message payload" });
  }

  const teammateId = Number(req.params.id);

  if (!Number.isInteger(teammateId) || teammateId <= 0) {
    return res.status(400).json({ message: "Invalid teammate id" });
  }

  if (teammateId === req.auth!.id) {
    return res.status(400).json({ message: "Choose another teammate to send a message." });
  }

  const teammate = await prisma.user.findUnique({
    where: { id: teammateId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!teammate) {
    return res.status(404).json({ message: "Teammate not found" });
  }

  if (!teammate.phone) {
    return res.status(400).json({
      message: "This teammate does not have a phone number configured yet.",
    });
  }

  const sender = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.id },
    select: { name: true, email: true },
  });

  await enqueuePhoneMessage(
    req.auth!.id,
    teammate.phone,
    `💬 Team message from ${sender.name || sender.email}\n\n${payload.data.message.trim()}`,
  );

  const message = await prisma.teamChatMessage.create({
    data: {
      senderUserId: req.auth!.id,
      recipientUserId: teammate.id,
      content: payload.data.message.trim(),
    },
    select: teamMessageSelect,
  });

  return res.json({ ok: true, message });
});

usersRouter.get("/:id/messages", requireAuth, async (req, res) => {
  const teammateId = Number(req.params.id);

  if (!Number.isInteger(teammateId) || teammateId <= 0) {
    return res.status(400).json({ message: "Invalid teammate id" });
  }

  if (teammateId === req.auth!.id) {
    return res.status(400).json({ message: "Choose another teammate to open a chat." });
  }

  const teammate = await prisma.user.findUnique({
    where: { id: teammateId },
    select: { id: true },
  });

  if (!teammate) {
    return res.status(404).json({ message: "Teammate not found" });
  }

  const messages = await prisma.teamChatMessage.findMany({
    where: {
      OR: [
        {
          senderUserId: req.auth!.id,
          recipientUserId: teammateId,
        },
        {
          senderUserId: teammateId,
          recipientUserId: req.auth!.id,
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    select: teamMessageSelect,
  });

  return res.json({ messages });
});

usersRouter.get("/:id", requireAuth, async (req, res) => {
  const userId = Number(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect,
  });

  if (!user) {
    return res.status(404).json({ message: "Team member not found" });
  }

  return res.json({ user });
});

usersRouter.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const payload = updateUserSchema.safeParse(req.body);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid team member payload" });
  }

  if (payload.data.firstReminderMinutes <= payload.data.secondReminderMinutes) {
    return res.status(400).json({
      message: "The first reminder must be earlier than the second reminder.",
    });
  }

  try {
    const currentUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { briefingTime: true, timeZone: true },
    });

    const shouldResetBriefingMarker =
      payload.data.briefingTime !== currentUser.briefingTime ||
      payload.data.timeZone !== currentUser.timeZone;

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          name: payload.data.name,
          email: payload.data.email,
          phone: payload.data.phone || null,
          profileImageUrl: payload.data.profileImageUrl || null,
          role: payload.data.role,
          timeZone: payload.data.timeZone,
          currency: payload.data.currency,
          briefingTime: payload.data.briefingTime,
          firstReminderMinutes: payload.data.firstReminderMinutes,
          secondReminderMinutes: payload.data.secondReminderMinutes,
          lastBriefSentAt: shouldResetBriefingMarker ? null : undefined,
        },
        select: { id: true },
      });

      await upsertUserAssignments(tx, userId, payload.data.assignments);

      return tx.user.findUniqueOrThrow({
        where: { id: updatedUser.id },
        select: userSelect,
      });
    });

    await invalidateCrmCache();

    return res.json({ user });
  } catch (error) {
    if (error instanceof Error && !("code" in error)) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(409).json({
      message: "Unable to update this team member. The email may already be in use.",
    });
  }
});

usersRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const payload = createUserSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid user payload" });
  }

  try {
    const passwordHash = await bcrypt.hash(payload.data.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: payload.data.name,
          email: payload.data.email,
          phone: payload.data.phone || null,
          profileImageUrl: payload.data.profileImageUrl || null,
          passwordHash,
          role: payload.data.role,
        },
        select: { id: true },
      });

      await upsertUserAssignments(tx, createdUser.id, payload.data.assignments ?? []);

      return tx.user.findUniqueOrThrow({
        where: { id: createdUser.id },
        select: userSelect,
      });
    });

    await invalidateCrmCache();

    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error && !("code" in error)) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(409).json({
      message: "A team member with this email already exists.",
    });
  }
});

return usersRouter;
}
