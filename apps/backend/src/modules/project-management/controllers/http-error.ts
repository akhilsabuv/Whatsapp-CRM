import type { Response } from "express";

const errorMap: Record<string, { status: number; message: string }> = {
  FORBIDDEN: { status: 403, message: "Forbidden" },
  PROJECT_NOT_FOUND: { status: 404, message: "Project not found" },
  TASK_NOT_FOUND: { status: 404, message: "Task not found" },
  LEAD_NOT_FOUND: { status: 404, message: "Lead not found" },
  CUSTOMER_NOT_FOUND: { status: 404, message: "Customer not found" },
  ASSIGNEE_NOT_FOUND: { status: 404, message: "Selected assignee not found" },
  PROJECT_MEMBER_NOT_FOUND: { status: 404, message: "One or more project members were not found" },
  PARENT_TASK_INVALID: { status: 400, message: "Parent task is invalid for this project" },
  TASK_LABEL_NOT_FOUND: { status: 404, message: "One or more task labels were not found" },
  TASK_LABEL_PROJECT_MISMATCH: { status: 400, message: "Task labels must belong to the same project" },
};

export function handleProjectManagementError(res: Response, error: unknown) {
  if (error instanceof Error && errorMap[error.message]) {
    const mapped = errorMap[error.message];
    return res.status(mapped.status).json({ message: mapped.message });
  }

  console.error("[project-management] unexpected error", error);
  return res.status(500).json({ message: "Project management request failed." });
}
