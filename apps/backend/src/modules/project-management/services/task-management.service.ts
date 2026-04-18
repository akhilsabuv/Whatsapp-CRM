import {
  ProjectMemberRole,
  TaskPriority,
  TaskStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { JwtUser } from "../../../utils/auth";
import { ProjectManagementEvents } from "../socket/project-management.events";
import { ProjectPermissionsService } from "./project-permissions.service";
import { TaskActivityService } from "./task-activity.service";
import { TaskNotificationsService } from "./task-notifications.service";

type CreateTaskInput = {
  projectId: number;
  parentTaskId?: number | null;
  leadId?: number | null;
  customerId?: number | null;
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: number | null;
  dueDate?: string | null;
  sortOrder?: number;
  labelIds?: number[];
};

type UpdateTaskInput = Partial<CreateTaskInput>;

export class TaskManagementService {
  constructor(
    private readonly events: ProjectManagementEvents,
    private readonly permissionsService = new ProjectPermissionsService(),
    private readonly activityService = new TaskActivityService(),
    private readonly notificationsService = new TaskNotificationsService(),
  ) {}

  async listTasks(actor: JwtUser, filters: {
    projectId?: number;
    status?: TaskStatus;
    assigneeId?: number;
    includeSubtasks?: boolean;
  }) {
    if (filters.projectId) {
      await this.permissionsService.assertCanViewProject(actor, filters.projectId);
    }

    return prisma.task.findMany({
      where: {
        ...(filters.projectId
          ? { projectId: filters.projectId }
          : actor.role === "ADMIN"
            ? {}
            : {
                project: {
                  OR: [
                    { ownerId: actor.id },
                    { members: { some: { userId: actor.id } } },
                  ],
                },
              }),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
        ...(filters.includeSubtasks ? {} : { parentTaskId: null }),
      },
      include: this.taskInclude(),
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async getTask(actor: JwtUser, taskId: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        ...this.taskInclude(),
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        activities: {
          include: {
            actor: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.permissionsService.assertCanViewProject(actor, task.projectId);
    return this.formatTask(task);
  }

  async createTask(actor: JwtUser, input: CreateTaskInput) {
    await this.permissionsService.assertProjectRole(
      actor,
      input.projectId,
      ProjectMemberRole.MEMBER,
    );

    await this.validateTaskLinks(input);

    const task = await prisma.task.create({
      data: {
        projectId: input.projectId,
        parentTaskId: input.parentTaskId ?? null,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        title: input.title,
        description: input.description || null,
        status: input.status ?? TaskStatus.TODO,
        priority: input.priority ?? TaskPriority.MEDIUM,
        assigneeId: input.assigneeId ?? null,
        reporterId: actor.id,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        sortOrder: input.sortOrder ?? 0,
        labels: input.labelIds?.length
          ? {
              create: input.labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: this.taskInclude(),
    });

    await this.activityService.log({
      projectId: task.projectId,
      taskId: task.id,
      actorUserId: actor.id,
      action: "TASK_CREATED",
      message: `Task "${task.title}" created.`,
    });

    await this.notificationsService.notifyAssignment(task);

    const payload = this.formatTask(task);
    this.events.emitTaskCreated(task.projectId, {
      type: "task.created",
      task: payload,
      projectId: task.projectId,
    });
    this.events.emitProjectUpdated(task.projectId, {
      type: "project.updated",
      projectId: task.projectId,
    });

    return payload;
  }

  async updateTask(actor: JwtUser, taskId: number, input: UpdateTaskInput) {
    const current = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        labels: true,
      },
    });

    if (!current) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.permissionsService.assertProjectRole(
      actor,
      current.projectId,
      ProjectMemberRole.MEMBER,
    );
    await this.validateTaskLinks(input);

    const nextStatus = input.status ?? current.status;
    const nextAssigneeId = input.assigneeId === undefined ? current.assigneeId : input.assigneeId;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        parentTaskId: input.parentTaskId === undefined ? undefined : input.parentTaskId,
        leadId: input.leadId === undefined ? undefined : input.leadId,
        customerId: input.customerId === undefined ? undefined : input.customerId,
        title: input.title ?? undefined,
        description: input.description === undefined ? undefined : input.description || null,
        status: input.status ?? undefined,
        priority: input.priority ?? undefined,
        assigneeId: input.assigneeId === undefined ? undefined : input.assigneeId,
        dueDate:
          input.dueDate === undefined
            ? undefined
            : input.dueDate
              ? new Date(input.dueDate)
              : null,
        sortOrder: input.sortOrder ?? undefined,
        startedAt:
          current.startedAt || nextStatus !== TaskStatus.IN_PROGRESS ? undefined : new Date(),
        completedAt:
          nextStatus === TaskStatus.DONE
            ? current.completedAt ?? new Date()
            : input.status && current.status === TaskStatus.DONE
              ? null
              : undefined,
        labels:
          input.labelIds !== undefined
            ? {
                deleteMany: {},
                create: input.labelIds.map((labelId) => ({ labelId })),
              }
            : undefined,
      },
      include: this.taskInclude(),
    });

    await this.logTaskDiffs(actor.id, current, task);

    if (nextAssigneeId !== current.assigneeId) {
      await this.notificationsService.notifyAssignment(task);
    }

    const payload = this.formatTask(task);
    this.events.emitTaskUpdated(task.projectId, {
      type: "task.updated",
      task: payload,
      projectId: task.projectId,
    });
    this.events.emitProjectUpdated(task.projectId, {
      type: "project.updated",
      projectId: task.projectId,
    });

    return payload;
  }

  async moveTask(actor: JwtUser, taskId: number, input: { status: TaskStatus; sortOrder: number }) {
    const task = await this.updateTask(actor, taskId, {
      status: input.status,
      sortOrder: input.sortOrder,
    });

    this.events.emitTaskMoved(task.projectId, {
      type: "task.moved",
      task,
      projectId: task.projectId,
      status: input.status,
      sortOrder: input.sortOrder,
    });

    return task;
  }

  async deleteTask(actor: JwtUser, taskId: number) {
    const current = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!current) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.permissionsService.assertProjectRole(
      actor,
      current.projectId,
      ProjectMemberRole.MEMBER,
    );

    await prisma.task.delete({
      where: { id: taskId },
    });

    await this.activityService.log({
      projectId: current.projectId,
      taskId,
      actorUserId: actor.id,
      action: "TASK_DELETED",
      message: `Task "${current.title}" deleted.`,
    });

    this.events.emitTaskDeleted(current.projectId, {
      type: "task.deleted",
      taskId,
      projectId: current.projectId,
    });
    this.events.emitProjectUpdated(current.projectId, {
      type: "project.updated",
      projectId: current.projectId,
    });
  }

  async listComments(actor: JwtUser, taskId: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.permissionsService.assertCanViewProject(actor, task.projectId);

    return prisma.taskComment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createComment(actor: JwtUser, taskId: number, content: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, title: true },
    });

    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    await this.permissionsService.assertProjectRole(
      actor,
      task.projectId,
      ProjectMemberRole.MEMBER,
    );

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        authorId: actor.id,
        content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await this.activityService.log({
      projectId: task.projectId,
      taskId,
      actorUserId: actor.id,
      action: "TASK_COMMENTED",
      message: `Comment added to task "${task.title}".`,
    });

    this.events.emitTaskCommented(task.projectId, {
      type: "task.commented",
      comment,
      taskId,
      projectId: task.projectId,
    });

    return comment;
  }

  isOverdue(task: { dueDate: Date | null; status: TaskStatus }) {
    return Boolean(task.dueDate && task.status !== TaskStatus.DONE && task.dueDate < new Date());
  }

  private async validateTaskLinks(input: {
    projectId?: number;
    parentTaskId?: number | null;
    leadId?: number | null;
    customerId?: number | null;
    assigneeId?: number | null;
    labelIds?: number[];
  }) {
    const checks = await Promise.all([
      input.parentTaskId
        ? prisma.task.findUnique({
            where: { id: input.parentTaskId },
            select: { id: true, projectId: true },
          })
        : Promise.resolve(null),
      input.leadId
        ? prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true } })
        : Promise.resolve(null),
      input.customerId
        ? prisma.lead.findUnique({
            where: { id: input.customerId },
            select: { id: true, status: true },
          })
        : Promise.resolve(null),
      input.assigneeId
        ? prisma.user.findUnique({ where: { id: input.assigneeId }, select: { id: true } })
        : Promise.resolve(null),
      input.labelIds?.length
        ? prisma.taskLabel.findMany({
            where: { id: { in: input.labelIds } },
            select: { id: true, projectId: true },
          })
        : Promise.resolve([]),
    ]);

    const [parentTask, lead, customer, assignee, labels] = checks;

    if (input.parentTaskId && (!parentTask || (input.projectId && parentTask.projectId !== input.projectId))) {
      throw new Error("PARENT_TASK_INVALID");
    }

    if (input.leadId && !lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (input.customerId && (!customer || customer.status !== "CUSTOMER")) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    if (input.assigneeId && !assignee) {
      throw new Error("ASSIGNEE_NOT_FOUND");
    }

    if (input.labelIds?.length && labels.length !== input.labelIds.length) {
      throw new Error("TASK_LABEL_NOT_FOUND");
    }

    if (input.projectId && labels.some((label) => label.projectId !== input.projectId)) {
      throw new Error("TASK_LABEL_PROJECT_MISMATCH");
    }
  }

  private async logTaskDiffs(
    actorUserId: number,
    before: {
      projectId: number;
      id: number;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: number | null;
      dueDate: Date | null;
    },
    after: {
      projectId: number;
      id: number;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      assigneeId: number | null;
      dueDate: Date | null;
    },
  ) {
    const changes: Array<{
      action: string;
      field: string;
      fromValue: string | null;
      toValue: string | null;
      message: string;
    }> = [];

    if (before.title !== after.title) {
      changes.push({
        action: "TASK_TITLE_CHANGED",
        field: "title",
        fromValue: before.title,
        toValue: after.title,
        message: `Task title changed from "${before.title}" to "${after.title}".`,
      });
    }

    if (before.status !== after.status) {
      changes.push({
        action: "TASK_STATUS_CHANGED",
        field: "status",
        fromValue: before.status,
        toValue: after.status,
        message: `Task status changed from ${before.status} to ${after.status}.`,
      });
    }

    if (before.priority !== after.priority) {
      changes.push({
        action: "TASK_PRIORITY_CHANGED",
        field: "priority",
        fromValue: before.priority,
        toValue: after.priority,
        message: `Task priority changed from ${before.priority} to ${after.priority}.`,
      });
    }

    if (before.assigneeId !== after.assigneeId) {
      changes.push({
        action: "TASK_ASSIGNEE_CHANGED",
        field: "assigneeId",
        fromValue: before.assigneeId ? String(before.assigneeId) : null,
        toValue: after.assigneeId ? String(after.assigneeId) : null,
        message: `Task assignee updated.`,
      });
    }

    if ((before.dueDate?.toISOString() ?? null) !== (after.dueDate?.toISOString() ?? null)) {
      changes.push({
        action: "TASK_DUE_DATE_CHANGED",
        field: "dueDate",
        fromValue: before.dueDate?.toISOString() ?? null,
        toValue: after.dueDate?.toISOString() ?? null,
        message: `Task due date updated.`,
      });
    }

    await Promise.all(
      changes.map((change) =>
        this.activityService.log({
          projectId: after.projectId,
          taskId: after.id,
          actorUserId,
          action: change.action,
          field: change.field,
          fromValue: change.fromValue,
          toValue: change.toValue,
          message: change.message,
        }),
      ),
    );
  }

  private taskInclude() {
    return {
      assignee: {
        select: { id: true, name: true, email: true },
      },
      reporter: {
        select: { id: true, name: true, email: true },
      },
      labels: {
        include: {
          label: true,
        },
      },
      subtasks: {
        select: {
          id: true,
          title: true,
          status: true,
          assigneeId: true,
          dueDate: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      _count: {
        select: {
          subtasks: true,
          comments: true,
        },
      },
    } satisfies Prisma.TaskInclude;
  }

  private formatTask(
    task: Prisma.TaskGetPayload<{ include: ReturnType<TaskManagementService["taskInclude"]> }>,
  ) {
    return {
      ...task,
      overdue: this.isOverdue(task),
      labels: task.labels.map((item) => item.label),
    };
  }
}
