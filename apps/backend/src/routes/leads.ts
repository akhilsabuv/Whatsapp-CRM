import { LeadStatus, Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getOrSetJson, invalidateCrmCache } from "../services/cache";
import { enqueueSelfMessage } from "../services/message-queue";
import type { BaileysSessionManager } from "../services/baileys/session-manager";
import { buildLeadAssignedMessage } from "../utils/messages";

const createLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(5),
  email: z.string().email().nullable().optional().or(z.literal("")),
  status: z.nativeEnum(LeadStatus).optional(),
  assignedToId: z.number().int().positive(),
  pipelineStage: z.string().min(2).default("NEW"),
  sourceCreatedTime: z.string().datetime().nullable().optional(),
  externalLeadId: z.string().nullable().optional(),
  adId: z.string().nullable().optional(),
  adName: z.string().nullable().optional(),
  adsetId: z.string().nullable().optional(),
  adsetName: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  campaignName: z.string().nullable().optional(),
  formId: z.string().nullable().optional(),
  formName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  preferredLocation: z.string().nullable().optional(),
  customDisclaimerResponses: z.string().nullable().optional(),
  isOrganic: z.boolean().nullable().optional(),
  platform: z.string().nullable().optional(),
});

const updateLeadSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().nullable().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  pipelineStage: z.string().min(2).optional(),
  assignedToId: z.number().int().positive().optional(),
  sourceCreatedTime: z.string().datetime().nullable().optional(),
  externalLeadId: z.string().nullable().optional(),
  adId: z.string().nullable().optional(),
  adName: z.string().nullable().optional(),
  adsetId: z.string().nullable().optional(),
  adsetName: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  campaignName: z.string().nullable().optional(),
  formId: z.string().nullable().optional(),
  formName: z.string().nullable().optional(),
  fullName: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  budget: z.string().nullable().optional(),
  preferredLocation: z.string().nullable().optional(),
  customDisclaimerResponses: z.string().nullable().optional(),
  isOrganic: z.boolean().nullable().optional(),
  platform: z.string().nullable().optional(),
});

const importLeadRowSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  assignedToId: z.number().int().positive().optional(),
  assignedToEmail: z.string().email().optional().or(z.literal("")).or(z.null()),
  pipelineStage: z.string().min(2).optional(),
  createdTime: z.string().optional().or(z.literal("")).or(z.null()),
  externalLeadId: z.string().optional().or(z.literal("")).or(z.null()),
  adId: z.string().optional().or(z.literal("")).or(z.null()),
  adName: z.string().optional().or(z.literal("")).or(z.null()),
  adsetId: z.string().optional().or(z.literal("")).or(z.null()),
  adsetName: z.string().optional().or(z.literal("")).or(z.null()),
  campaignId: z.string().optional().or(z.literal("")).or(z.null()),
  campaignName: z.string().optional().or(z.literal("")).or(z.null()),
  formId: z.string().optional().or(z.literal("")).or(z.null()),
  formName: z.string().optional().or(z.literal("")).or(z.null()),
  fullName: z.string().optional().or(z.literal("")).or(z.null()),
  city: z.string().optional().or(z.literal("")).or(z.null()),
  budget: z.string().optional().or(z.literal("")).or(z.null()),
  preferredLocation: z.string().optional().or(z.literal("")).or(z.null()),
  customDisclaimerResponses: z.string().optional().or(z.literal("")).or(z.null()),
  isOrganic: z.boolean().optional().or(z.null()),
  platform: z.string().optional().or(z.literal("")).or(z.null()),
});

const importLeadSchema = z.object({
  rows: z.array(importLeadRowSchema).min(1),
});

export function createLeadsRouter(sessionManager: BaileysSessionManager) {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    const cacheKey = `leads:list:${req.auth!.role}:${req.auth!.id}`;
    const leads = await getOrSetJson(cacheKey, async () =>
      prisma.lead.findMany({
        where: req.auth!.role === "ADMIN" ? {} : { assignedToId: req.auth!.id },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          actions: {
            where: { isDone: false },
            orderBy: { scheduledAt: "asc" },
            take: 3,
          },
        },
        orderBy: [{ pipelineStage: "asc" }, { updatedAt: "desc" }],
      }),
    );

    return res.json({ leads });
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const leadId = Number(req.params.id);

    const cacheKey = `lead:detail:${leadId}:${req.auth!.role}:${req.auth!.id}`;
    const lead = await getOrSetJson(cacheKey, async () =>
      prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          assignedTo: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          actions: {
            orderBy: { scheduledAt: "asc" },
          },
          leadProjects: {
            orderBy: { createdAt: "desc" },
          },
          customerProjects: {
            orderBy: { createdAt: "desc" },
          },
          transfers: {
            include: {
              fromUser: {
                select: { id: true, email: true },
              },
              toUser: {
                select: { id: true, email: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
          messages: {
            orderBy: { sentAt: "desc" },
            take: 20,
          },
        },
      }),
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (req.auth!.role !== "ADMIN" && lead.assignedToId !== req.auth!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({
      lead: {
        ...lead,
        projects: [...lead.leadProjects, ...lead.customerProjects].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        ),
      },
    });
  });

  router.post("/", requireAuth, async (req, res) => {
    const payload = createLeadSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid lead payload" });
    }

    try {
      const lead = await prisma.lead.create({
        data: {
          name: payload.data.name,
          phone: payload.data.phone,
          email: payload.data.email || null,
          status: payload.data.status ?? LeadStatus.LEAD,
          assignedToId: payload.data.assignedToId,
          pipelineStage: payload.data.pipelineStage,
          sourceCreatedTime: payload.data.sourceCreatedTime
            ? new Date(payload.data.sourceCreatedTime)
            : null,
          externalLeadId: payload.data.externalLeadId || null,
          adId: payload.data.adId || null,
          adName: payload.data.adName || null,
          adsetId: payload.data.adsetId || null,
          adsetName: payload.data.adsetName || null,
          campaignId: payload.data.campaignId || null,
          campaignName: payload.data.campaignName || null,
          formId: payload.data.formId || null,
          formName: payload.data.formName || null,
          fullName: payload.data.fullName || null,
          city: payload.data.city || null,
          budget: payload.data.budget || null,
          preferredLocation: payload.data.preferredLocation || null,
          customDisclaimerResponses: payload.data.customDisclaimerResponses || null,
          isOrganic: payload.data.isOrganic ?? null,
          platform: payload.data.platform || null,
        },
        include: {
          assignedTo: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      await enqueueSelfMessage(lead.assignedToId, buildLeadAssignedMessage(lead), lead.id);
      await invalidateCrmCache();

      return res.status(201).json({ lead });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002" && error.meta?.target) {
          const target = Array.isArray(error.meta.target)
            ? error.meta.target.join(", ")
            : String(error.meta.target);
          return res.status(409).json({
            message:
              target === "phone"
                ? "A lead with this phone number already exists."
                : `A record with the same ${target} already exists.`,
          });
        }

        if (error.code === "P2003") {
          return res.status(400).json({
            message: "The selected assignee is invalid.",
          });
        }
      }

      console.error("[leads.create] unexpected error", error);
      return res.status(500).json({ message: "Failed to create lead." });
    }
  });

  router.post("/import", requireAuth, async (req, res) => {
    const payload = importLeadSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid import payload" });
    }

    try {
      const emailSet = new Set(
        payload.data.rows
          .map((row) => row.assignedToEmail?.trim())
          .filter((email): email is string => Boolean(email)),
      );

      const usersByEmail = emailSet.size
        ? await prisma.user.findMany({
            where: {
              email: { in: Array.from(emailSet) },
            },
            select: { id: true, email: true },
          })
        : [];

      const userMap = new Map(usersByEmail.map((user) => [user.email.toLowerCase(), user.id]));

      const data = payload.data.rows.map((row) => {
        const assignedFromEmail = row.assignedToEmail
          ? userMap.get(row.assignedToEmail.toLowerCase())
          : undefined;

        return {
          name: row.name ?? row.fullName ?? "Imported Lead",
          phone: row.phone ?? "",
          email: row.email || null,
          sourceCreatedTime:
            row.createdTime && !Number.isNaN(Date.parse(row.createdTime))
              ? new Date(row.createdTime)
              : null,
          externalLeadId: row.externalLeadId || null,
          adId: row.adId || null,
          adName: row.adName || null,
          adsetId: row.adsetId || null,
          adsetName: row.adsetName || null,
          campaignId: row.campaignId || null,
          campaignName: row.campaignName || null,
          formId: row.formId || null,
          formName: row.formName || null,
          fullName: row.fullName || row.name || null,
          city: row.city || null,
          budget: row.budget || null,
          preferredLocation: row.preferredLocation || null,
          customDisclaimerResponses: row.customDisclaimerResponses || null,
          isOrganic: row.isOrganic ?? null,
          platform: row.platform || null,
          assignedToId:
            req.auth!.role === "ADMIN"
              ? row.assignedToId ?? assignedFromEmail ?? req.auth!.id
              : req.auth!.id,
          pipelineStage: row.pipelineStage ?? "NEW",
        };
      }).filter((row) => row.phone);

      const result = await prisma.lead.createMany({
        data,
        skipDuplicates: true,
      });

      await invalidateCrmCache();

      return res.status(201).json({
        imported: result.count,
        skipped: data.length - result.count,
        total: data.length,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return res.status(400).json({
          message: "One or more assignees in the import file are invalid.",
        });
      }

      console.error("[leads.import] unexpected error", error);
      return res.status(500).json({ message: "Failed to import leads." });
    }
  });

  router.patch("/:id", requireAuth, async (req, res) => {
    const leadId = Number(req.params.id);
    const payload = updateLeadSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid lead payload" });
    }

    const existing = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (req.auth!.role !== "ADMIN" && existing.assignedToId !== req.auth!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const leadUpdateData: Prisma.LeadUpdateInput = {
        ...payload.data,
        sourceCreatedTime:
          payload.data.sourceCreatedTime === undefined
            ? undefined
            : payload.data.sourceCreatedTime
              ? new Date(payload.data.sourceCreatedTime)
              : null,
      };

      const lead = await prisma.lead.update({
        where: { id: leadId },
        data: leadUpdateData,
        include: {
          assignedTo: {
            select: { id: true, email: true, role: true },
          },
        },
      });

      await invalidateCrmCache();

      return res.json({ lead });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002" && error.meta?.target) {
          const target = Array.isArray(error.meta.target)
            ? error.meta.target.join(", ")
            : String(error.meta.target);
          return res.status(409).json({
            message:
              target === "phone"
                ? "A lead with this phone number already exists."
                : `A record with the same ${target} already exists.`,
          });
        }

        if (error.code === "P2003") {
          return res.status(400).json({
            message: "The selected assignee is invalid.",
          });
        }
      }

      console.error("[leads.update] unexpected error", error);
      return res.status(500).json({ message: "Failed to update lead." });
    }
  });

  return router;
}
