import { prisma } from "../lib/prisma";

type LogCronJobInput = {
  jobType: string;
  action: string;
  status: string;
  userId?: number | null;
  scheduledFor?: Date | null;
  details?: string | null;
};

export async function logCronJob(input: LogCronJobInput) {
  try {
    await prisma.cronJobLog.create({
      data: {
        jobType: input.jobType,
        action: input.action,
        status: input.status,
        userId: input.userId ?? null,
        scheduledFor: input.scheduledFor ?? null,
        details: input.details ?? null,
      },
    });
  } catch (error) {
    console.error("[cron-log] failed to persist cron log", error);
  }
}
