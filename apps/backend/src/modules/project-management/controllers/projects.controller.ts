import type { Request, Response } from "express";
import { ProjectManagementService } from "../services/project-management.service";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
} from "../validators/project-management.validators";
import { handleProjectManagementError } from "./http-error";

export class ProjectsController {
  constructor(private readonly service: ProjectManagementService) {}

  create = async (req: Request, res: Response) => {
    const payload = createProjectSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid project payload" });
    }

    try {
      const project = await this.service.createProject(req.auth!, payload.data);
      return res.status(201).json({ project });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  list = async (req: Request, res: Response) => {
    const query = listProjectsQuerySchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({ message: "Invalid project filter payload" });
    }

    try {
      const projects = await this.service.listProjects(req.auth!, query.data);
      return res.json({ projects });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  getById = async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);

    try {
      const project = await this.service.getProject(req.auth!, projectId);
      return res.json({ project });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };

  update = async (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const payload = updateProjectSchema.safeParse(req.body);

    if (!payload.success) {
      return res.status(400).json({ message: "Invalid project payload" });
    }

    try {
      const project = await this.service.updateProject(req.auth!, projectId, payload.data);
      return res.json({ project });
    } catch (error) {
      return handleProjectManagementError(res, error);
    }
  };
}
