import { TaskStatus, type Task } from "@prisma/client";
import { enqueueSelfMessage } from "../../../services/message-queue";

export class TaskNotificationsService {
  async notifyAssignment(task: Pick<Task, "id" | "title" | "projectId" | "assigneeId">) {
    if (!task.assigneeId) {
      return;
    }

    await enqueueSelfMessage(
      task.assigneeId,
      `Task assigned: ${task.title}\nProject ID: ${task.projectId}\nTask ID: ${task.id}`,
    );
  }

  async notifyDueSoon(task: Pick<Task, "id" | "title" | "projectId" | "assigneeId" | "dueDate">) {
    if (!task.assigneeId || !task.dueDate) {
      return;
    }

    await enqueueSelfMessage(
      task.assigneeId,
      `Due soon: ${task.title}\nProject ID: ${task.projectId}\nDue: ${task.dueDate.toISOString()}`,
    );
  }

  async notifyOverdue(task: Pick<Task, "id" | "title" | "projectId" | "assigneeId" | "dueDate" | "status">) {
    if (!task.assigneeId || !task.dueDate || task.status === TaskStatus.DONE) {
      return;
    }

    await enqueueSelfMessage(
      task.assigneeId,
      `Overdue task: ${task.title}\nProject ID: ${task.projectId}\nDue: ${task.dueDate.toISOString()}`,
    );
  }
}
