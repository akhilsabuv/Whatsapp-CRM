import { ProjectMemberRole } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { JwtUser } from "../../../utils/auth";

const roleRank: Record<ProjectMemberRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  PROJECT_OWNER: 2,
  ADMIN: 3,
};

export type ProjectAccessContext = {
  projectId: number;
  ownerId: number;
  memberRole: ProjectMemberRole | null;
};

export class ProjectPermissionsService {
  async getProjectAccessContext(
    user: JwtUser,
    projectId: number,
  ): Promise<ProjectAccessContext | null> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        ownerId: true,
        members: {
          where: { userId: user.id },
          select: { role: true },
          take: 1,
        },
      },
    });

    if (!project) {
      return null;
    }

    return {
      projectId: project.id,
      ownerId: project.ownerId,
      memberRole: project.members[0]?.role ?? null,
    };
  }

  async assertCanViewProject(user: JwtUser, projectId: number) {
    const context = await this.getProjectAccessContext(user, projectId);

    if (!context) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    if (user.role === "ADMIN" || context.ownerId === user.id || context.memberRole) {
      return context;
    }

    throw new Error("FORBIDDEN");
  }

  async assertProjectRole(
    user: JwtUser,
    projectId: number,
    minimumRole: ProjectMemberRole,
  ) {
    const context = await this.assertCanViewProject(user, projectId);

    if (user.role === "ADMIN" || context.ownerId === user.id) {
      return context;
    }

    if (context.memberRole && roleRank[context.memberRole] >= roleRank[minimumRole]) {
      return context;
    }

    throw new Error("FORBIDDEN");
  }
}
