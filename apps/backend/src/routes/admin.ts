import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const adminRouter = Router();

adminRouter.get("/cron-jobs", requireAuth, requireAdmin, async (req, res) => {
  const limitParam = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 500)
    : 100;

  const logs = await prisma.cronJobLog.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { executedAt: "desc" },
    take: limit,
  });

  return res.json({ logs });
});
