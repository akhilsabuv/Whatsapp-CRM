import { Router } from "express";
import { requireAuth } from "../../../middleware/auth";
import { TasksController } from "../controllers/tasks.controller";

export function createTasksRouter(controller: TasksController) {
  const router = Router();

  router.post("/", requireAuth, controller.create);
  router.get("/", requireAuth, controller.list);
  router.get("/:id", requireAuth, controller.getById);
  router.patch("/:id", requireAuth, controller.update);
  router.patch("/:id/move", requireAuth, controller.move);
  router.delete("/:id", requireAuth, controller.remove);
  router.get("/:id/comments", requireAuth, controller.listComments);
  router.post("/:id/comments", requireAuth, controller.createComment);

  return router;
}
