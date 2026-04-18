import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { invalidateCrmCache } from "../services/cache";

const createActionSchema = z.object({
  leadId: z.number().int().positive(),
  title: z.string().min(2),
  notes: z.string().optional(),
  scheduledAt: z.string().datetime(),
});

const updateActionSchema = z.object({
  title: z.string().min(2).optional(),
  notes: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  outcomeStatus: z.string().regex(/^[A-Z0-9_]+$/).optional(),
  nextActionTitle: z.string().min(2).nullable().optional(),
  nextActionNotes: z.string().nullable().optional(),
  nextActionScheduledAt: z.string().datetime().nullable().optional(),
});

export const actionsRouter = Router();

actionsRouter.post("/", requireAuth, async (req, res) => {
  const payload = createActionSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid action payload" });
  }

  const lead = await prisma.lead.findUnique({
    where: { id: payload.data.leadId },
  });

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  if (req.auth!.role !== "ADMIN" && lead.assignedToId !== req.auth!.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const action = await prisma.action.create({
    data: {
      leadId: lead.id,
      assignedToId: lead.assignedToId,
      title: payload.data.title,
      notes: payload.data.notes,
      scheduledAt: new Date(payload.data.scheduledAt),
    },
  });

  await invalidateCrmCache();

  return res.status(201).json({
    action,
    reminderWindowsUtc: {
      thirtyMinutesBefore: new Date(action.scheduledAt.getTime() - 30 * 60 * 1000),
      fifteenMinutesBefore: new Date(action.scheduledAt.getTime() - 15 * 60 * 1000),
    },
  });
});

actionsRouter.patch("/:id", requireAuth, async (req, res) => {
  const actionId = Number(req.params.id);
  const payload = updateActionSchema.safeParse(req.body);

  if (!payload.success) {
    return res.status(400).json({ message: "Invalid action payload" });
  }

  const existing = await prisma.action.findUnique({
    where: { id: actionId },
    include: { lead: true },
  });

  if (!existing) {
    return res.status(404).json({ message: "Action not found" });
  }

  if (req.auth!.role !== "ADMIN" && existing.assignedToId !== req.auth!.id) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const nextActionTitle =
    payload.data.nextActionTitle === undefined
      ? undefined
      : payload.data.nextActionTitle
        ? payload.data.nextActionTitle.trim() || null
        : null;
  const nextActionScheduledAt =
    payload.data.nextActionScheduledAt === undefined
      ? undefined
      : payload.data.nextActionScheduledAt
        ? new Date(payload.data.nextActionScheduledAt)
        : null;

  if ((nextActionTitle && !nextActionScheduledAt) || (!nextActionTitle && nextActionScheduledAt)) {
    return res.status(400).json({
      message: "Next action title and next action schedule are both required together.",
    });
  }

  const currentOutcomeStatus =
    (existing as { outcomeStatus?: string }).outcomeStatus ?? "PENDING";
  const outcomeStatus = payload.data.outcomeStatus ?? currentOutcomeStatus;
  const shouldMarkHandled = outcomeStatus !== "PENDING";

  const result = await prisma.$transaction(async (tx) => {
    const action = await tx.action.update({
      where: { id: actionId },
      data: {
        title: payload.data.title,
        notes: payload.data.notes,
        scheduledAt: payload.data.scheduledAt ? new Date(payload.data.scheduledAt) : undefined,
        outcomeStatus,
        isDone: shouldMarkHandled,
        completedAt: shouldMarkHandled ? new Date() : null,
        nextActionTitle,
        nextActionNotes:
          payload.data.nextActionNotes === undefined ? undefined : payload.data.nextActionNotes || null,
        nextActionScheduledAt,
      },
    });

    let followUpAction = null;

    if (nextActionTitle && nextActionScheduledAt) {
      followUpAction = await tx.action.create({
        data: {
          leadId: existing.leadId,
          assignedToId: existing.assignedToId,
          title: nextActionTitle,
          notes: payload.data.nextActionNotes || null,
          scheduledAt: nextActionScheduledAt,
        },
      });
    }

    return { action, followUpAction };
  });

  await invalidateCrmCache();

  return res.json(result);
});
