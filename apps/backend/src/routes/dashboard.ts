import { TransferStatus } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getOrSetJson } from "../services/cache";
import { enqueueSelfMessage } from "../services/message-queue";
import { buildMorningBrief } from "../utils/messages";
import { endOfUtcDay, startOfUtcDay } from "../utils/time";
import type { BaileysSessionManager } from "../services/baileys/session-manager";

function buildDashboardScope(userId: number, role: string) {
  const now = new Date();
  const start = startOfUtcDay(now);
  const end = endOfUtcDay(now);
  const leadWhere = { assignedToId: userId };
  const actionWhere = {
    assignedToId: userId,
    scheduledAt: { gte: start, lt: end },
  };
  const transferWhere =
    role === "ADMIN"
      ? {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        }
      : {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        };
  const pendingTransferWhere =
    role === "ADMIN"
      ? {
          status: TransferStatus.PENDING,
          OR: [{ fromUserId: userId }, { toUserId: userId }],
        }
      : { status: TransferStatus.PENDING, toUserId: userId };

  return { now, start, end, leadWhere, actionWhere, transferWhere, pendingTransferWhere };
}

export function createDashboardRouter(sessionManager: BaileysSessionManager) {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    const cacheKey = `dashboard:${req.auth!.role}:${req.auth!.id}`;
    const payload = await getOrSetJson(cacheKey, async () => {
      const { now, start, end, leadWhere, actionWhere, transferWhere, pendingTransferWhere } = buildDashboardScope(
        req.auth!.id,
        req.auth!.role,
      );

      const [user, todayActions, todayProjectTasks, recentTransfers, metrics] = await Promise.all([
        prisma.user.findUniqueOrThrow({
          where: { id: req.auth!.id },
          select: {
            timeZone: true,
            currency: true,
            language: true,
            briefingTime: true,
            firstReminderMinutes: true,
            secondReminderMinutes: true,
          },
        }),
        prisma.action.findMany({
          where: {
            ...actionWhere,
            isDone: false,
          },
          include: {
            lead: true,
          },
          orderBy: { scheduledAt: "asc" },
          take: 10,
        }),
        prisma.task.findMany({
          where: {
            assigneeId: req.auth!.id,
            status: { not: "DONE" },
            dueDate: { gte: start, lt: end },
          },
          include: {
            project: {
              select: { title: true },
            },
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        }),
        prisma.transfer.findMany({
          where: transferWhere,
          include: {
            lead: true,
            fromUser: { select: { email: true } },
            toUser: { select: { email: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 6,
        }),
        Promise.all([
          prisma.lead.count({ where: leadWhere }),
          prisma.lead.count({ where: { ...leadWhere, status: "CUSTOMER" } }),
          prisma.lead.count({ where: { ...leadWhere, pipelineStage: "NEW", status: "LEAD" } }),
          prisma.transfer.count({ where: pendingTransferWhere }),
        ]),
      ]);

      return {
        todayActions,
        todayProjectTasks,
        recentTransfers,
        metrics: {
          totalLeads: metrics[0],
          customers: metrics[1],
          pendingTransfers: metrics[3],
          dueToday: todayActions.length,
        },
        morningBrief: {
          generatedAtUtc: now,
          message: buildMorningBrief(
            todayActions,
            todayProjectTasks,
            now,
            metrics[2],
            user.timeZone,
            user.language,
          ),
        },
      };
    });

    return res.json(payload);
  });

  router.post("/send-summary", requireAuth, async (req, res) => {
    const { actionWhere, leadWhere } = buildDashboardScope(req.auth!.id, req.auth!.role);

    const now = new Date();
    const start = startOfUtcDay(now);
    const end = endOfUtcDay(now);

    const [user, todayActions, todayProjectTasks, newLeadCount] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: req.auth!.id },
        select: { timeZone: true, language: true },
      }),
      prisma.action.findMany({
        where: {
          ...actionWhere,
          isDone: false,
        },
        include: {
          lead: true,
        },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.task.findMany({
        where: {
          assigneeId: req.auth!.id,
          status: { not: "DONE" },
          dueDate: { gte: start, lt: end },
        },
        include: {
          project: {
            select: { title: true },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.lead.count({
        where: { ...leadWhere, pipelineStage: "NEW", status: "LEAD" },
      }),
    ]);

    const message = buildMorningBrief(
      todayActions,
      todayProjectTasks,
      now,
      newLeadCount,
      user.timeZone,
      user.language,
    );
    await enqueueSelfMessage(req.auth!.id, message);

    return res.json({
      ok: true,
      sentActions: todayActions.length,
      sentTasks: todayProjectTasks.length,
      queued: true,
    });
  });

  return router;
}
