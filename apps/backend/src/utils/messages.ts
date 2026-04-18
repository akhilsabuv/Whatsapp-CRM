import type { Action, Lead, Task, Transfer, User } from "@prisma/client";
import { formatInTimeZone, formatUtcTime, hourInTimeZone } from "./time";

type ActionWithLead = Action & {
  lead: Lead;
};

type TaskWithProject = Task & {
  project: {
    title: string;
  };
};

function getBriefingHeading(generatedAt: Date, timeZone: string) {
  const hour = hourInTimeZone(generatedAt, timeZone);

  if (hour < 12) {
    return "🌅 Morning Briefing";
  }

  if (hour < 17) {
    return "☀️ Afternoon Briefing";
  }

  return "🌙 Evening Briefing";
}

export function buildMorningBrief(
  actions: ActionWithLead[],
  tasks: TaskWithProject[],
  generatedAt: Date,
  newLeadCount: number,
  timeZone: string,
  language: string,
) {
  const heading = getBriefingHeading(generatedAt, timeZone);
  const generatedAtLabel = `${formatInTimeZone(generatedAt, timeZone, language, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} ${timeZone}`;

  if (actions.length === 0 && tasks.length === 0) {
    return [
      heading,
      generatedAtLabel,
      `New Leads(${newLeadCount})`,
      "You have no scheduled actions or project tasks for today.",
    ].join("\n");
  }

  const actionLines = actions.map(
    (action, index) =>
      `${index + 1}. ${action.title} for ${action.lead.name} at ${formatInTimeZone(
        action.scheduledAt,
        timeZone,
        language,
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        },
      )} ${timeZone}`,
  );

  const taskOffset = actionLines.length;
  const taskLines = tasks.map(
    (task, index) =>
      `${taskOffset + index + 1}. ${task.title} in ${task.project.title} by ${formatInTimeZone(
        task.dueDate!,
        timeZone,
        language,
        {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        },
      )} ${timeZone}`,
  );

  return [
    heading,
    generatedAtLabel,
    `New Leads(${newLeadCount})`,
    `You have ${actions.length} CRM action${actions.length === 1 ? "" : "s"} and ${tasks.length} project task${tasks.length === 1 ? "" : "s"} due today.`,
    ...actionLines,
    ...taskLines,
  ].join("\n");
}

export function buildReminderMessage(
  action: ActionWithLead,
  minutesUntil: number,
) {
  return `⏳ Reminder: ${action.title} for ${action.lead.name} in ${minutesUntil} minutes (${formatUtcTime(action.scheduledAt)} UTC).`;
}

export function buildLeadAssignedMessage(lead: Lead) {
  return `🚨 New Lead Assigned: ${lead.name}. Phone: ${lead.phone}. Open the CRM to review and act.`;
}

export function buildTransferRequestMessage(
  transfer: Transfer & { lead: Lead; fromUser: User },
) {
  return `🔄 ${transfer.fromUser.email} requested transfer of ${transfer.lead.name}. Open the CRM to accept or reject.`;
}

export function buildTransferAcceptedMessage(
  transfer: Transfer & { lead: Lead; toUser: User },
) {
  return `✅ Transfer complete: ${transfer.lead.name} is now assigned to ${transfer.toUser.email}.`;
}
