import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import type { BaileysSessionManager } from "../services/baileys/session-manager";

const initSchema = z.object({
  userId: z.number().int().positive().optional(),
  force: z.boolean().optional(),
});

export function createWhatsAppRouter(sessionManager: BaileysSessionManager) {
  const router = Router();

  router.get("/session/state", requireAuth, async (req, res) => {
    const userId = req.auth!.id;
    const state = await sessionManager.getConnectionState(userId);
    return res.json(state);
  });

  router.post("/session/init", requireAuth, async (req, res) => {
    const payload = initSchema.safeParse(req.body);
    const requestedUserId = payload.success ? payload.data.userId : undefined;
    const force = payload.success ? payload.data.force : false;
    const userId =
      req.auth?.role === "ADMIN" && requestedUserId ? requestedUserId : req.auth!.id;

    try {
      if (force) {
        await sessionManager.reset(userId);
      }
      await sessionManager.initializeForUserIfNeeded(userId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to initialize WhatsApp session";
      return res.status(500).json({ message });
    }

    return res.json({ ok: true, userId });
  });

  return router;
}
