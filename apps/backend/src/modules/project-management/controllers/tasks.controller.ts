import type { Request, Response } from "express";
import { TaskManagementService } from "../services/task-management.service";
import {
  createTaskCommentSchema,
  createTaskSchema,
  listTasksQuerySchema,
  moveTaskSchema,
  updateTaskSchema,
} from "../validators/project-management.validators";
import { handleProjectManagementError } from "./http-error";

export class TasksController {
  constructor(private readonly service: TaskManagementService) {}

  create = async (req: Request, res: Response) => {
    const payload = createTaskSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid task payload" });
    }

    try {
      const task = await this.service.createTask(req.auth!, payload.data);
      return res.status(201).json({ task });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  list = async (req: Request, res: Response) => {
    const query = listTasksQuerySchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({ message: "Invalid task filter payload" });
    }

    try {
      const tasks = await this.service.listTasks(req.auth!, query.data);
      return res.json({ tasks });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  getById = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);

    try {
      const task = await this.service.getTask(req.auth!, taskId);
      return res.json({ task });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  update = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const payload = updateTaskSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid task payload" });
    }

    try {
      const task = await this.service.updateTask(req.auth!, taskId, payload.data);
      return res.json({ task });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  move = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const payload = moveTaskSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid task move payload" });
    }

    try {
      const task = await this.service.moveTask(req.auth!, taskId, payload.data);
      return res.json({ task });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  remove = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);

    try {
      await this.service.deleteTask(req.auth!, taskId);
      return res.status(204).send();
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  listComments = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);

    try {
      const comments = await this.service.listComments(req.auth!, taskId);
      return res.json({ comments });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  createComment = async (req: Request, res: Response) => {
    const taskId = Number(req.params.id);
    const payload = createTaskCommentSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid task comment payload" });
    }

    try {
      const comment = await this.service.createComment(req.auth!, taskId, payload.data.content);
      return res.status(201).json({ comment });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };
}
