import { prisma } from "../../../lib/prisma";

type CreateActivityInput = {
  projectId: number;
  taskId?: number | null;
  actorUserId?: number | null;
  action: string;
  field?: string | null;
  fromValue?: string | null;
  toValue?: string | null;
  message: string;
  metadataJson?: string | null;
};

export class TaskActivityService {
  async log(input: CreateActivityInput) {
    return prisma.taskActivity.create({
      data: {
        projectId: input.projectId,
        taskId: input.taskId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        field: input.field ?? null,
        fromValue: input.fromValue ?? null,
        toValue: input.toValue ?? null,
        message: input.message,
        metadataJson: input.metadataJson ?? null,
      },
    });
  }
}
