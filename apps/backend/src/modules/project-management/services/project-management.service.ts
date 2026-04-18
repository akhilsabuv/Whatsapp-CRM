import {
  ProjectMemberRole,
  ProjectStatus,
  TaskStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { JwtUser } from "../../../utils/auth";
import { ProjectManagementEvents } from "../socket/project-management.events";
import { TaskActivityService } from "./task-activity.service";
import { ProjectPermissionsService } from "./project-permissions.service";

type CreateProjectInput = {
  title: string;
  key?: string | null;
  description?: string | null;
  notes?: string | null;
  status?: ProjectStatus;
  ownerId?: number;
  leadId?: number | null;
  customerId?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  members?: Array<{ userId: number; role: ProjectMemberRole }>;
};

type UpdateProjectInput = Partial<CreateProjectInput> & {
  completedAt?: string | null;
};

type ListProjectsInput = {
  search?: string;
  status?: ProjectStatus;
  ownerId?: number;
};

export class ProjectManagementService {
  constructor(
    private readonly events: ProjectManagementEvents,
    private readonly activityService = new TaskActivityService(),
    private readonly permissionsService = new ProjectPermissionsService(),
  ) {}

  private async ensureLinkedEntities(input: {
    leadId?: number | null;
    customerId?: number | null;
  }) {
    const [lead, customer] = await Promise.all([
      input.leadId
        ? prisma.lead.findUnique({ where: { id: input.leadId }, select: { id: true } })
        : Promise.resolve(null),
      input.customerId
        ? prisma.lead.findUnique({
            where: { id: input.customerId },
            select: { id: true, status: true },
          })
        : Promise.resolve(null),
    ]);

    if (input.leadId && !lead) {
      throw new Error("LEAD_NOT_FOUND");
    }

    if (input.customerId && (!customer || customer.status !== "CUSTOMER")) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }
  }

  private async buildMemberships(
    ownerId: number,
    members: Array<{ userId: number; role: ProjectMemberRole }> = [],
  ) {
    const uniqueMembers = new Map<number, ProjectMemberRole>();
    uniqueMembers.set(ownerId, ProjectMemberRole.PROJECT_OWNER);

    for (const member of members) {
      uniqueMembers.set(
        member.userId,
        member.userId === ownerId ? ProjectMemberRole.PROJECT_OWNER : member.role,
      );
    }

    const existingUsers = await prisma.user.findMany({
      where: { id: { in: Array.from(uniqueMembers.keys()) } },
      select: { id: true },
    });

    if (existingUsers.length !== uniqueMembers.size) {
      throw new Error("PROJECT_MEMBER_NOT_FOUND");
    }

    return Array.from(uniqueMembers.entries()).map(([userId, role]) => ({ userId, role }));
  }

  async createProject(actor: JwtUser, input: CreateProjectInput) {
    const ownerId = input.ownerId ?? actor.id;
    const canChooseOwner = actor.role === "ADMIN" || ownerId === actor.id;

    if (!canChooseOwner) {
      throw new Error("FORBIDDEN");
    }

    await this.ensureLinkedEntities(input);
    const members = await this.buildMemberships(ownerId, input.members);

    const project = await prisma.project.create({
      data: {
        title: input.title,
        key: input.key || null,
        description: input.description || null,
        notes: input.notes || null,
        status: input.status ?? ProjectStatus.PLANNING,
        ownerId,
        leadId: input.leadId ?? null,
        customerId: input.customerId ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        members: {
          create: members,
        },
      },
      include: this.projectInclude(),
    });

    await this.activityService.log({
      projectId: project.id,
      actorUserId: actor.id,
      action: "PROJECT_CREATED",
      message: `Project "${project.title}" created.`,
    });

    const summary = await this.getProject(actor, project.id);
    this.events.emitProjectUpdated(project.id, {
      type: "project.updated",
      project: summary,
    });

    return summary;
  }

  async listProjects(actor: JwtUser, filters: ListProjectsInput) {
    const andFilters: Prisma.ProjectWhereInput[] = [];

    if (actor.role !== "ADMIN") {
      andFilters.push({
        OR: [{ ownerId: actor.id }, { members: { some: { userId: actor.id } } }],
      });
    }

    if (filters.search?.trim()) {
      andFilters.push({
        OR: [
          { title: { contains: filters.search.trim(), mode: "insensitive" } },
          { key: { contains: filters.search.trim(), mode: "insensitive" } },
        ],
      });
    }

    if (filters.status) {
      andFilters.push({ status: filters.status });
    }

    if (filters.ownerId) {
      andFilters.push({ ownerId: filters.ownerId });
    }

    const where: Prisma.ProjectWhereInput = andFilters.length ? { AND: andFilters } : {};

    const projects = await prisma.project.findMany({
      where,
      include: this.projectInclude(),
      orderBy: [{ updatedAt: "desc" }],
    });

    return projects.map((project) => this.formatProject(project));
  }

  async getProject(actor: JwtUser, projectId: number) {
    await this.permissionsService.assertCanViewProject(actor, projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        ...this.projectInclude(),
        tasks: {
          include: {
            assignee: {
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
            },
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        activities: {
          include: {
            actor: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!project) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    return this.formatProject(project);
  }

  async updateProject(actor: JwtUser, projectId: number, input: UpdateProjectInput) {
    await this.permissionsService.assertProjectRole(
      actor,
      projectId,
      ProjectMemberRole.PROJECT_OWNER,
    );
    await this.ensureLinkedEntities(input);

    const current = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!current) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    const members = input.members
      ? await this.buildMemberships(input.ownerId ?? current.ownerId, input.members)
      : null;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: input.title ?? undefined,
        key: input.key === undefined ? undefined : input.key || null,
        description: input.description === undefined ? undefined : input.description || null,
        notes: input.notes === undefined ? undefined : input.notes || null,
        status: input.status ?? undefined,
        ownerId: input.ownerId ?? undefined,
        leadId: input.leadId === undefined ? undefined : input.leadId,
        customerId: input.customerId === undefined ? undefined : input.customerId,
        startDate:
          input.startDate === undefined
            ? undefined
            : input.startDate
              ? new Date(input.startDate)
              : null,
        dueDate:
          input.dueDate === undefined
            ? undefined
            : input.dueDate
              ? new Date(input.dueDate)
              : null,
        completedAt:
          input.completedAt === undefined
            ? undefined
            : input.completedAt
              ? new Date(input.completedAt)
              : null,
        members: members
          ? {
              deleteMany: {},
              create: members,
            }
          : undefined,
      },
      include: this.projectInclude(),
    });

    if (input.status && input.status !== current.status) {
      await this.activityService.log({
        projectId,
        actorUserId: actor.id,
        action: "PROJECT_STATUS_CHANGED",
        field: "status",
        fromValue: current.status,
        toValue: input.status,
        message: `Project status changed from ${current.status} to ${input.status}.`,
      });
    }

    const summary = await this.getProject(actor, project.id);
    this.events.emitProjectUpdated(project.id, {
      type: "project.updated",
      project: summary,
    });

    return summary;
  }

  calculateProgress(tasks: Array<{ status: TaskStatus }>) {
    const tracked = tasks.filter((task) => task.status !== null);

    if (!tracked.length) {
      return 0;
    }

    const completed = tracked.filter((task) => task.status === TaskStatus.DONE).length;
    return Math.round((completed / tracked.length) * 100);
  }

  private projectInclude() {
    return {
      owner: {
        select: { id: true, name: true, email: true },
      },
      lead: {
        select: { id: true, name: true, status: true },
      },
      customer: {
        select: { id: true, name: true, status: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
      },
      labels: {
        orderBy: { name: "asc" },
      },
      _count: {
        select: {
          tasks: true,
        },
      },
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          assigneeId: true,
        },
      },
    } satisfies Prisma.ProjectInclude;
  }

  private formatProject(project: Prisma.ProjectGetPayload<{ include: ReturnType<ProjectManagementService["projectInclude"]> }>) {
    const overdueTasks = project.tasks.filter(
      (task) => task.status !== TaskStatus.DONE && task.dueDate && task.dueDate < new Date(),
    ).length;

    return {
      ...project,
      progress: this.calculateProgress(project.tasks),
      overdueTaskCount: overdueTasks,
    };
  }
}
