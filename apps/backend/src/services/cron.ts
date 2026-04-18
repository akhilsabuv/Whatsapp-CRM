import cron from "node-cron";
import { prisma } from "../lib/prisma";
import type { BaileysSessionManager } from "./baileys/session-manager";
import { invalidateCrmCache } from "./cache";
import {
  buildMorningBrief,
  buildReminderMessage,
} from "../utils/messages";
import { enqueueSelfMessage } from "./message-queue";
import { logCronJob } from "./cron-log";
import {
  dateKeyInTimeZone,
  endOfUtcDay,
  minutesFromTimeString,
  startOfUtcDay,
  timeInTimeZone,
} from "../utils/time";

export function registerCronJobs(sessionManager: BaileysSessionManager) {
  cron.schedule(
    "* * * * *",
    async () => {
      const now = new Date();
      const start = startOfUtcDay(now);
      const end = endOfUtcDay(now);
      const users = await prisma.user.findMany({
        select: {
          id: true,
          timeZone: true,
          language: true,
          briefingTime: true,
          lastBriefSentAt: true,
        },
      });

      await Promise.all(
        users.map(async (user) => {
          const nowInTimeZone = timeInTimeZone(now, user.timeZone);
          if (
            minutesFromTimeString(nowInTimeZone) <
            minutesFromTimeString(user.briefingTime)
          ) {
            return;
          }

          if (
            user.lastBriefSentAt &&
            dateKeyInTimeZone(user.lastBriefSentAt, user.timeZone) ===
              dateKeyInTimeZone(now, user.timeZone)
          ) {
            return;
          }

          const [userActions, userProjectTasks, newLeadCount] = await Promise.all([
            prisma.action.findMany({
              where: {
                assignedToId: user.id,
                isDone: false,
                scheduledAt: {
                  gte: start,
                  lt: end,
                },
              },
              include: {
                lead: true,
              },
              orderBy: {
                scheduledAt: "asc",
              },
            }),
            prisma.task.findMany({
              where: {
                assigneeId: user.id,
                status: { not: "DONE" },
                dueDate: {
                  gte: start,
                  lt: end,
                },
              },
              include: {
                project: {
                  select: { title: true },
                },
              },
              orderBy: {
                dueDate: "asc",
              },
            }),
            prisma.lead.count({
              where: {
                assignedToId: user.id,
                pipelineStage: "NEW",
                status: "LEAD",
              },
            }),
          ]);

          const message = buildMorningBrief(
            userActions,
            userProjectTasks,
            now,
            newLeadCount,
            user.timeZone,
            user.language,
          );
          try {
            await enqueueSelfMessage(user.id, message);
            await logCronJob({
              jobType: "BRIEFING",
              action: `Queued daily briefing for user ${user.id}`,
              status: "QUEUED",
              userId: user.id,
              scheduledFor: now,
              details: `Actions: ${userActions.length}, Tasks: ${userProjectTasks.length}, New leads: ${newLeadCount}`,
            });
          } catch (error) {
            await logCronJob({
              jobType: "BRIEFING",
              action: `Failed to queue daily briefing for user ${user.id}`,
              status: "FAILED",
              userId: user.id,
              scheduledFor: now,
              details: error instanceof Error ? error.message : "Unknown queue error",
            });
            return;
          }

          await prisma.user.update({
            where: { id: user.id },
            data: { lastBriefSentAt: now },
          });

          if (userActions.length) {
            await prisma.action.updateMany({
              where: {
                id: {
                  in: userActions.map((action) => action.id),
                },
              },
              data: {
                summarySentAt: now,
              },
            });
          }

          await invalidateCrmCache();
        }),
      );
    },
    { timezone: "UTC" },
  );

  cron.schedule(
    "* * * * *",
    async () => {
      const now = new Date();
      const actions = await prisma.action.findMany({
        where: {
          isDone: false,
          OR: [
            { remind30Sent: false },
            { remind15Sent: false },
          ],
        },
        include: {
          lead: true,
          assignedTo: {
            select: {
              firstReminderMinutes: true,
              secondReminderMinutes: true,
            },
          },
        },
      });

      for (const action of actions) {
        const firstReminderAt = new Date(
          action.scheduledAt.getTime() - action.assignedTo.firstReminderMinutes * 60 * 1000,
        );
        const secondReminderAt = new Date(
          action.scheduledAt.getTime() - action.assignedTo.secondReminderMinutes * 60 * 1000,
        );

        if (!action.remind30Sent && now >= firstReminderAt) {
          try {
            await enqueueSelfMessage(
              action.assignedToId,
              buildReminderMessage(action, action.assignedTo.firstReminderMinutes),
              action.leadId,
            );
            await logCronJob({
              jobType: "REMINDER",
              action: `Queued ${action.assignedTo.firstReminderMinutes}m reminder for action ${action.id}`,
              status: "QUEUED",
              userId: action.assignedToId,
              scheduledFor: firstReminderAt,
              details: action.title,
            });
          } catch (error) {
            await logCronJob({
              jobType: "REMINDER",
              action: `Failed ${action.assignedTo.firstReminderMinutes}m reminder for action ${action.id}`,
              status: "FAILED",
              userId: action.assignedToId,
              scheduledFor: firstReminderAt,
              details: error instanceof Error ? error.message : "Unknown queue error",
            });
            continue;
          }
          await prisma.action.update({
            where: { id: action.id },
            data: { remind30Sent: true },
          });
          await invalidateCrmCache();
        }

        if (!action.remind15Sent && now >= secondReminderAt) {
          try {
            await enqueueSelfMessage(
              action.assignedToId,
              buildReminderMessage(action, action.assignedTo.secondReminderMinutes),
              action.leadId,
            );
            await logCronJob({
              jobType: "REMINDER",
              action: `Queued ${action.assignedTo.secondReminderMinutes}m reminder for action ${action.id}`,
              status: "QUEUED",
              userId: action.assignedToId,
              scheduledFor: secondReminderAt,
              details: action.title,
            });
          } catch (error) {
            await logCronJob({
              jobType: "REMINDER",
              action: `Failed ${action.assignedTo.secondReminderMinutes}m reminder for action ${action.id}`,
              status: "FAILED",
              userId: action.assignedToId,
              scheduledFor: secondReminderAt,
              details: error instanceof Error ? error.message : "Unknown queue error",
            });
            continue;
          }
          await prisma.action.update({
            where: { id: action.id },
            data: { remind15Sent: true },
          });
          await invalidateCrmCache();
        }
      }
    },
    { timezone: "UTC" },
  );

  cron.schedule(
    "* * * * *",
    async () => {
      const now = new Date();
      const tasks = await prisma.task.findMany({
        where: {
          assigneeId: { not: null },
          dueDate: { not: null },
          status: { not: "DONE" },
        },
        include: {
          project: {
            select: { title: true },
          },
          assignee: {
            select: {
              id: true,
              firstReminderMinutes: true,
            },
          },
        },
      });

      for (const task of tasks) {
        if (!task.assigneeId || !task.dueDate || !task.assignee) {
          continue;
        }

        const dueSoonAt = new Date(
          task.dueDate.getTime() - task.assignee.firstReminderMinutes * 60 * 1000,
        );

        if (!task.dueSoonNotifiedAt && now >= dueSoonAt && now < task.dueDate) {
          try {
            await enqueueSelfMessage(
              task.assigneeId,
              `Task due soon: ${task.title}\nProject: ${task.project.title}\nDue: ${task.dueDate.toISOString()}`,
            );
            await prisma.task.update({
              where: { id: task.id },
              data: { dueSoonNotifiedAt: now },
            });
            await logCronJob({
              jobType: "TASK_DUE_SOON",
              action: `Queued due-soon reminder for task ${task.id}`,
              status: "QUEUED",
              userId: task.assigneeId,
              scheduledFor: dueSoonAt,
              details: task.title,
            });
          } catch (error) {
            await logCronJob({
              jobType: "TASK_DUE_SOON",
              action: `Failed due-soon reminder for task ${task.id}`,
              status: "FAILED",
              userId: task.assigneeId,
              scheduledFor: dueSoonAt,
              details: error instanceof Error ? error.message : "Unknown queue error",
            });
          }
        }

        if (!task.overdueNotifiedAt && now >= task.dueDate) {
          try {
            await enqueueSelfMessage(
              task.assigneeId,
              `Task overdue: ${task.title}\nProject: ${task.project.title}\nDue: ${task.dueDate.toISOString()}`,
            );
            await prisma.task.update({
              where: { id: task.id },
              data: { overdueNotifiedAt: now },
            });
            await logCronJob({
              jobType: "TASK_OVERDUE",
              action: `Queued overdue alert for task ${task.id}`,
              status: "QUEUED",
              userId: task.assigneeId,
              scheduledFor: task.dueDate,
              details: task.title,
            });
          } catch (error) {
            await logCronJob({
              jobType: "TASK_OVERDUE",
              action: `Failed overdue alert for task ${task.id}`,
              status: "FAILED",
              userId: task.assigneeId,
              scheduledFor: task.dueDate,
              details: error instanceof Error ? error.message : "Unknown queue error",
            });
          }
        }
      }
    },
    { timezone: "UTC" },
  );
}
