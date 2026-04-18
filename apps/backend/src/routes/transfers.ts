import { TransferStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { getOrSetJson, invalidateCrmCache } from "../services/cache";
import { enqueueSelfMessage } from "../services/message-queue";
import type { BaileysSessionManager } from "../services/baileys/session-manager";
import {
  buildTransferAcceptedMessage,
  buildTransferRequestMessage,
} from "../utils/messages";

const requestSchema = z.object({
  leadId: z.number().int().positive(),
  toUserId: z.number().int().positive(),
});

export function createTransfersRouter(sessionManager: BaileysSessionManager) {
  const router = Router();

  async function completeTransfer(
    transferId: number,
    status: TransferStatus,
  ) {
    const transfer = await prisma.$transaction(async (tx) => {
      const updatedTransfer = await tx.transfer.update({
        where: { id: transferId },
        data: { status },
        include: {
          lead: true,
          toUser: true,
        },
      });

      if (status === TransferStatus.ACCEPTED) {
        await tx.lead.update({
          where: { id: updatedTransfer.leadId },
          data: { assignedToId: updatedTransfer.toUserId },
        });

        await tx.action.updateMany({
          where: {
            leadId: updatedTransfer.leadId,
            isDone: false,
          },
          data: {
            assignedToId: updatedTransfer.toUserId,
          },
        });
      }

      return updatedTransfer;
    });

    if (status === TransferStatus.ACCEPTED) {
      await enqueueSelfMessage(
        transfer.fromUserId,
        buildTransferAcceptedMessage(transfer),
        transfer.leadId,
      );
    }

    await invalidateCrmCache();

    return transfer;
  }

  router.get("/pending", requireAuth, async (req, res) => {
    const cacheKey = `transfers:pending:${req.auth!.role}:${req.auth!.id}`;
    const transfers = await getOrSetJson(cacheKey, async () =>
      prisma.transfer.findMany({
        where:
          req.auth!.role === "ADMIN"
            ? { status: TransferStatus.PENDING }
            : {
                status: TransferStatus.PENDING,
                OR: [{ toUserId: req.auth!.id }, { fromUserId: req.auth!.id }],
              },
        include: {
          lead: true,
          fromUser: {
            select: { id: true, email: true },
          },
          toUser: {
            select: { id: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );

    return res.json({ transfers });
  });

  router.post("/request", requireAuth, async (req, res) => {
    const payload = requestSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid transfer payload" });
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

    if (lead.assignedToId === payload.data.toUserId) {
      return res.status(400).json({
        message: "This lead is already assigned to the selected teammate.",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: payload.data.toUserId },
      select: { id: true },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "Selected teammate not found" });
    }

    const existingPendingTransfer = await prisma.transfer.findFirst({
      where: {
        leadId: lead.id,
        status: TransferStatus.PENDING,
      },
    });

    if (existingPendingTransfer) {
      return res.status(409).json({
        message: "A transfer request for this lead is already pending.",
      });
    }

    const status =
      req.auth!.role === "ADMIN" ? TransferStatus.ACCEPTED : TransferStatus.PENDING;

    const transfer = await prisma.transfer.create({
      data: {
        leadId: lead.id,
        fromUserId: lead.assignedToId,
        toUserId: payload.data.toUserId,
        status,
      },
      include: {
        lead: true,
        fromUser: true,
        toUser: true,
      },
    });

    if (req.auth!.role === "ADMIN") {
      const completedTransfer = await completeTransfer(transfer.id, TransferStatus.ACCEPTED);
      return res.status(201).json({ transfer: completedTransfer });
    }

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        enqueueSelfMessage(
          admin.id,
          buildTransferRequestMessage(transfer),
          transfer.leadId,
        ),
      ),
    );

    await invalidateCrmCache();

    return res.status(201).json({ transfer });
  });

  router.post("/:id/accept", requireAuth, async (req, res) => {
    const transferId = Number(req.params.id);
    const existing = await prisma.transfer.findUnique({
      where: { id: transferId },
      include: {
        lead: true,
        toUser: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    if (req.auth!.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (existing.status !== TransferStatus.PENDING) {
      return res.status(409).json({
        message: `This transfer was already ${existing.status.toLowerCase()}.`,
      });
    }

    const transfer = await completeTransfer(transferId, TransferStatus.ACCEPTED);
    return res.json({ transfer });
  });

  router.post("/:id/force", requireAuth, requireAdmin, async (req, res) => {
    const transferId = Number(req.params.id);
    const existing = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    if (existing.status !== TransferStatus.PENDING) {
      return res.status(409).json({
        message: `This transfer was already ${existing.status.toLowerCase()}.`,
      });
    }

    const transfer = await completeTransfer(transferId, TransferStatus.ACCEPTED);
    return res.json({ transfer });
  });

  router.post("/:id/reject", requireAuth, async (req, res) => {
    const transferId = Number(req.params.id);
    const existing = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Transfer not found" });
    }

    if (req.auth!.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (existing.status !== TransferStatus.PENDING) {
      return res.status(409).json({
        message: `This transfer was already ${existing.status.toLowerCase()}.`,
      });
    }

    const transfer = await completeTransfer(transferId, TransferStatus.REJECTED);

    return res.json({ transfer });
  });

  return router;
}
