import type { AppSocketServer } from "../../../services/socket";
import { projectRoom } from "../../../services/socket";

export const PROJECT_SOCKET_EVENTS = {
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  TASK_DELETED: "task.deleted",
  TASK_MOVED: "task.moved",
  TASK_COMMENTED: "task.commented",
  PROJECT_UPDATED: "project.updated",
} as const;

export class ProjectManagementEvents {
  constructor(private readonly io: AppSocketServer) {}

  emitProjectUpdated(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.PROJECT_UPDATED, payload);
  }

  emitTaskCreated(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.TASK_CREATED, payload);
  }

  emitTaskUpdated(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.TASK_UPDATED, payload);
  }

  emitTaskDeleted(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.TASK_DELETED, payload);
  }

  emitTaskMoved(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.TASK_MOVED, payload);
  }

  emitTaskCommented(projectId: number, payload: Record<string, unknown>) {
    this.io.to(projectRoom(projectId)).emit(PROJECT_SOCKET_EVENTS.TASK_COMMENTED, payload);
  }
}
