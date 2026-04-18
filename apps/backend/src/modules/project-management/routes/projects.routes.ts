import { Router } from "express";
import { requireAuth } from "../../../middleware/auth";
import { ProjectsController } from "../controllers/projects.controller";

export function createProjectsRouter(controller: ProjectsController) {
  const router = Router();

  router.post("/", requireAuth, controller.create);
  router.get("/", requireAuth, controller.list);
  router.get("/:id", requireAuth, controller.getById);
  router.patch("/:id", requireAuth, controller.update);

  return router;
}
