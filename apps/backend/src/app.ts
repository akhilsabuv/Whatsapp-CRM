import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { redis } from "./lib/redis";
import { createProjectManagementModule } from "./modules/project-management";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { actionsRouter } from "./routes/actions";
import { createDashboardRouter } from "./routes/dashboard";
import { docsRouter } from "./routes/docs";
import { createUsersRouter } from "./routes/users";
import { createLeadsRouter } from "./routes/leads";
import { createTransfersRouter } from "./routes/transfers";
import { createWhatsAppRouter } from "./routes/whatsapp";
import type { BaileysSessionManager } from "./services/baileys/session-manager";
import type { AppSocketServer } from "./services/socket";

export function createApp(sessionManager: BaileysSessionManager, io: AppSocketServer) {
  const app = express();
  const projectManagement = createProjectManagementModule(io);

  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      redis: redis.status,
    });
  });

  app.use(docsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/dashboard", createDashboardRouter(sessionManager));
  app.use("/api/users", createUsersRouter(sessionManager));
  app.use("/api/actions", actionsRouter);
  app.use("/api/projects", projectManagement.projectsRouter);
  app.use("/api/tasks", projectManagement.tasksRouter);
  app.use("/api/leads", createLeadsRouter(sessionManager));
  app.use("/api/transfers", createTransfersRouter(sessionManager));
  app.use("/api/whatsapp", createWhatsAppRouter(sessionManager));

  app.use(
    (
      error: Error & { type?: string; status?: number; statusCode?: number },
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error.type === "entity.too.large" || error.status === 413 || error.statusCode === 413) {
        return res.status(413).json({
          message: "Import file is too large. Try a smaller batch or increase the server import limit.",
        });
      }

      return next(error);
    },
  );

  return app;
}
