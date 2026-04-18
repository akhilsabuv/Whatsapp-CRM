import type { AppSocketServer } from "../../services/socket";
import { ProjectsController } from "./controllers/projects.controller";
import { TasksController } from "./controllers/tasks.controller";
import { createProjectsRouter } from "./routes/projects.routes";
import { createTasksRouter } from "./routes/tasks.routes";
import { ProjectManagementEvents } from "./socket/project-management.events";
import { ProjectManagementService } from "./services/project-management.service";
import { TaskManagementService } from "./services/task-management.service";

export function createProjectManagementModule(io: AppSocketServer) {
  const events = new ProjectManagementEvents(io);
  const projectService = new ProjectManagementService(events);
  const taskService = new TaskManagementService(events);

  return {
    projectsRouter: createProjectsRouter(new ProjectsController(projectService)),
    tasksRouter: createTasksRouter(new TasksController(taskService)),
    projectService,
    taskService,
  };
}
