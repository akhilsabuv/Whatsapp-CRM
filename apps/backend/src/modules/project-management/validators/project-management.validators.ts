import {
  ProjectMemberRole,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import { z } from "zod";

const isoDate = z.string().datetime().optional().nullable().or(z.literal(""));

export const projectMemberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.nativeEnum(ProjectMemberRole).default(ProjectMemberRole.MEMBER),
});

export const createProjectSchema = z.object({
  title: z.string().min(2).max(120),
  key: z.string().trim().min(2).max(32).optional().nullable().or(z.literal("")),
  description: z.string().max(4000).optional().nullable().or(z.literal("")),
  notes: z.string().max(4000).optional().nullable().or(z.literal("")),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.number().int().positive().optional(),
  leadId: z.number().int().positive().optional().nullable(),
  customerId: z.number().int().positive().optional().nullable(),
  startDate: isoDate,
  dueDate: isoDate,
  members: z.array(projectMemberSchema).optional(),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  completedAt: isoDate,
});

export const listProjectsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  ownerId: z.coerce.number().int().positive().optional(),
});

export const createTaskSchema = z.object({
  projectId: z.number().int().positive(),
  parentTaskId: z.number().int().positive().optional().nullable(),
  leadId: z.number().int().positive().optional().nullable(),
  customerId: z.number().int().positive().optional().nullable(),
  title: z.string().min(2).max(160),
  description: z.string().max(4000).optional().nullable().or(z.literal("")),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.number().int().positive().optional().nullable(),
  dueDate: isoDate,
  sortOrder: z.number().int().min(0).optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
});

export const updateTaskSchema = z.object({
  parentTaskId: z.number().int().positive().optional().nullable(),
  leadId: z.number().int().positive().optional().nullable(),
  customerId: z.number().int().positive().optional().nullable(),
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(4000).optional().nullable().or(z.literal("")),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  assigneeId: z.number().int().positive().optional().nullable(),
  dueDate: isoDate,
  sortOrder: z.number().int().min(0).optional(),
  labelIds: z.array(z.number().int().positive()).optional(),
});

export const moveTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  sortOrder: z.number().int().min(0),
});

export const listTasksQuerySchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  includeSubtasks: z.coerce.boolean().optional(),
});

export const createTaskCommentSchema = z.object({
  content: z.string().min(1).max(4000),
});
