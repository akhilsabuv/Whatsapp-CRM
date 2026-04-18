import { Router } from "express";

function buildOpenApiDocument(baseUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "WhatsApp CRM API",
      version: "1.0.0",
      description:
        "Interactive backend API reference for the local WhatsApp-integrated CRM. This spec covers authentication, dashboard data, lead management, teammate management, transfers, WhatsApp session control, and chat-style team messaging.",
    },
    servers: [
      {
        url: baseUrl,
        description: "Local backend server",
      },
    ],
    tags: [
      {
        name: "System",
        description: "Health and platform-level endpoints used to verify backend availability.",
      },
      {
        name: "Authentication",
        description: "Login and current-user endpoints for JWT-based access control.",
      },
      {
        name: "Dashboard",
        description: "Dashboard payloads, briefing mirror data, and summary sending actions.",
      },
      {
        name: "Users",
        description: "Team member listing, settings, chat history, and team administration endpoints.",
      },
      {
        name: "Admin",
        description: "Admin-only operational endpoints for observability and management tooling.",
      },
      {
        name: "Leads",
        description: "Lead listing and lead creation endpoints for the CRM pipeline.",
      },
      {
        name: "Actions",
        description: "Scheduled follow-ups and task creation endpoints tied to leads.",
      },
      {
        name: "Project Management",
        description: "Projects, tasks, comments, kanban movement, and delivery workflow endpoints.",
      },
      {
        name: "Transfers",
        description: "Lead transfer queues and ownership handoff requests.",
      },
      {
        name: "WhatsApp",
        description: "WhatsApp session bootstrap, QR pairing, and connection state endpoints.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste the JWT returned from /api/auth/login as a Bearer token.",
        },
      },
      schemas: {
        LoginRequest: {
          title: "Login Request",
          description: "Credentials used to authenticate a CRM user and receive a JWT token.",
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
              description: "Team member email address.",
              example: "admin@crm.local",
            },
            password: {
              type: "string",
              description: "Plain-text password for the user account.",
              example: "admin123",
            },
          },
        },
        LeadCreateRequest: {
          title: "Create Lead Request",
          description: "Payload used to create a lead and place it into the CRM pipeline.",
          type: "object",
          required: ["name", "phone", "assignedToId"],
          properties: {
            name: { type: "string", description: "Primary lead name shown across the CRM." },
            phone: {
              type: "string",
              description: "International phone number including country code.",
              example: "+919999999999",
            },
            email: { type: "string", format: "email", nullable: true },
            assignedToId: {
              type: "integer",
              description: "Owner user id for the lead.",
              example: 2,
            },
            pipelineStage: {
              type: "string",
              description: "Lead stage id, for example NEW, COLD, WARM, HOT, or a custom stage.",
              example: "NEW",
            },
          },
        },
        UserCreateRequest: {
          title: "Create Team Member Request",
          description: "Payload used by admins to create a new teammate account.",
          type: "object",
          required: ["name", "email", "password", "role"],
          properties: {
            name: { type: "string", description: "Display name used in the Teams page and chat." },
            email: { type: "string", format: "email" },
            phone: {
              type: "string",
              nullable: true,
              description: "Optional WhatsApp number with country code.",
              example: "+919876543210",
            },
            password: { type: "string", description: "Initial password for the teammate." },
            role: {
              type: "string",
              enum: ["ADMIN", "USER"],
              description: "Authorization role for the teammate.",
            },
          },
        },
        TeamMessageRequest: {
          title: "Team Chat Message Request",
          description: "Chat message sent from the current user's WhatsApp session to a teammate.",
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "Message content to send and persist in team chat history.",
            },
          },
        },
        ActionCreateRequest: {
          title: "Create Action Request",
          description: "Payload used to schedule the next action against a lead.",
          type: "object",
          properties: {
            leadId: { type: "integer", example: 12 },
            title: { type: "string", example: "Follow-up call" },
            notes: { type: "string", nullable: true },
            scheduledAt: {
              type: "string",
              format: "date-time",
              description: "Scheduled UTC datetime.",
            },
          },
        },
        TransferRequest: {
          title: "Transfer Request",
          description: "Payload used to request or trigger a lead ownership transfer.",
          type: "object",
          properties: {
            leadId: { type: "integer", example: 8 },
            toUserId: { type: "integer", example: 3 },
          },
        },
        ProjectCreateRequest: {
          title: "Create Project Request",
          description: "Payload used to create a delivery project and optionally link CRM records.",
          type: "object",
          required: ["title"],
          properties: {
            title: { type: "string", example: "Tower A Launch" },
            key: { type: "string", nullable: true, example: "TAL" },
            description: { type: "string", nullable: true },
            notes: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"],
            },
            ownerId: { type: "integer", nullable: true, example: 1 },
            leadId: { type: "integer", nullable: true, example: 14 },
            customerId: { type: "integer", nullable: true, example: 21 },
            dueDate: { type: "string", format: "date-time", nullable: true },
          },
        },
        TaskCreateRequest: {
          title: "Create Task Request",
          description: "Payload used to create a task or subtask within a project.",
          type: "object",
          required: ["projectId", "title"],
          properties: {
            projectId: { type: "integer", example: 4 },
            parentTaskId: { type: "integer", nullable: true, example: 22 },
            title: { type: "string", example: "Collect customer approvals" },
            description: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            },
            assigneeId: { type: "integer", nullable: true, example: 2 },
            dueDate: { type: "string", format: "date-time", nullable: true },
          },
        },
        TaskMoveRequest: {
          title: "Move Task Request",
          description: "Payload used by the kanban board to move a task and persist its order.",
          type: "object",
          required: ["status", "sortOrder"],
          properties: {
            status: {
              type: "string",
              enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"],
            },
            sortOrder: { type: "integer", example: 1000 },
          },
        },
        TaskCommentRequest: {
          title: "Task Comment Request",
          description: "Payload used to add a comment to a task thread.",
          type: "object",
          required: ["content"],
          properties: {
            content: { type: "string", example: "Waiting on the pricing sheet." },
          },
        },
        WhatsAppInitRequest: {
          title: "WhatsApp Session Init Request",
          description: "Optional force reset before requesting a fresh QR pairing session.",
          type: "object",
          properties: {
            force: {
              type: "boolean",
              default: false,
              description: "When true, clears the existing session and issues a fresh QR.",
            },
          },
        },
        CronJobLogResponse: {
          title: "Cron Job Log Entry",
          description: "Operational log row for a cron-triggered job such as a briefing or reminder.",
          type: "object",
          properties: {
            id: { type: "integer", example: 14 },
            jobType: { type: "string", example: "BRIEFING" },
            action: { type: "string", example: "Queued daily briefing for user 1" },
            status: { type: "string", example: "QUEUED" },
            details: { type: "string", nullable: true, example: "Actions: 3, New leads: 2" },
            scheduledFor: { type: "string", format: "date-time", nullable: true },
            executedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/health": {
        get: {
          tags: ["System"],
          summary: "Health check",
          description: "Simple availability probe used to confirm the backend process is healthy.",
          operationId: "healthCheck",
          responses: {
            "200": {
              description: "Service is healthy.",
            },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Login",
          description: "Authenticate with email and password to receive a JWT token and user profile.",
          operationId: "login",
          requestBody: {
            required: true,
            description: "Login credentials for a CRM user.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LoginRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Authenticated successfully." },
            "401": { description: "Invalid credentials." },
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Authentication"],
          summary: "Current user",
          description: "Return the currently authenticated user's profile and UI settings.",
          operationId: "getCurrentUser",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Authenticated user profile." },
            "401": { description: "Unauthorized." },
          },
        },
      },
      "/api/dashboard": {
        get: {
          tags: ["Dashboard"],
          summary: "Dashboard payload",
          description: "Return dashboard metrics, due actions, transfers, and the current briefing mirror.",
          operationId: "getDashboard",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Dashboard summary data." },
          },
        },
      },
      "/api/dashboard/send-summary": {
        post: {
          tags: ["Dashboard"],
          summary: "Send briefing summary",
          description: "Send the current user's formatted briefing summary to their WhatsApp session.",
          operationId: "sendDashboardSummary",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Summary sent successfully." },
            "409": { description: "WhatsApp session is not ready." },
          },
        },
      },
      "/api/users": {
        get: {
          tags: ["Users"],
          summary: "List team members",
          description: "Return teammates visible to the current user, including WhatsApp status and workspace settings.",
          operationId: "listUsers",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Team member list." },
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create team member",
          description: "Admin-only endpoint to create a new teammate profile.",
          operationId: "createUser",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            description: "Team member details for the new account.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserCreateRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Team member created." },
            "409": { description: "A user with the same email already exists." },
          },
        },
      },
      "/api/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get team member",
          description: "Return the full editable profile for a specific teammate.",
          operationId: "getUserById",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Team member id.",
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Team member profile." },
            "404": { description: "Team member not found." },
          },
        },
        patch: {
          tags: ["Users"],
          summary: "Update team member",
          description: "Admin-only endpoint to update a teammate profile and workspace settings.",
          operationId: "updateUserById",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Team member id.",
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            description: "Updated teammate profile payload.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserCreateRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Team member updated." },
            "409": { description: "Update conflict, usually duplicate email." },
          },
        },
      },
      "/api/users/{id}/messages": {
        get: {
          tags: ["Users"],
          summary: "Get team chat history",
          description: "Load the stored chat history between the authenticated user and a teammate.",
          operationId: "getUserMessages",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Teammate id for the conversation thread.",
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "Chat history returned successfully." },
            "404": { description: "Teammate not found." },
          },
        },
      },
      "/api/users/{id}/message": {
        post: {
          tags: ["Users"],
          summary: "Send team chat message",
          description: "Send a WhatsApp message from the current user's connected session to a teammate and store it in chat history.",
          operationId: "sendUserMessage",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Recipient teammate id.",
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            description: "Outbound team chat message content.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TeamMessageRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Message sent and stored." },
            "409": { description: "Sender WhatsApp session is not ready." },
          },
        },
      },
      "/api/admin/cron-jobs": {
        get: {
          tags: ["Admin"],
          summary: "List cron job logs",
          description: "Admin-only endpoint that returns recent cron-triggered briefing and reminder log entries.",
          operationId: "listCronJobLogs",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Maximum number of rows to return. Defaults to 100 and caps at 500.",
              schema: { type: "integer", default: 100 },
            },
          ],
          responses: {
            "200": { description: "Cron job log rows returned." },
            "403": { description: "Admin access required." },
          },
        },
      },
      "/api/leads": {
        get: {
          tags: ["Leads"],
          summary: "List leads",
          description: "Return leads visible to the current user, honoring admin and owner scoping rules.",
          operationId: "listLeads",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Lead list." },
          },
        },
        post: {
          tags: ["Leads"],
          summary: "Create lead",
          description: "Create a lead or customer record in the CRM pipeline.",
          operationId: "createLead",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            description: "Core lead fields required to create a CRM record.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/LeadCreateRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Lead created." },
            "409": { description: "Duplicate lead phone number." },
          },
        },
      },
      "/api/actions": {
        post: {
          tags: ["Actions"],
          summary: "Create action",
          description: "Create a scheduled lead action that can trigger summaries and reminder notifications.",
          operationId: "createAction",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            description: "Action scheduling payload.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ActionCreateRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Action created." },
          },
        },
      },
      "/api/projects": {
        post: {
          tags: ["Project Management"],
          summary: "Create project",
          description: "Create a new project with ownership, timing, and optional CRM links.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectCreateRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Project created." },
            "400": { description: "Invalid project payload." },
          },
        },
        get: {
          tags: ["Project Management"],
          summary: "List projects",
          description: "List projects visible to the current user, with optional search and status filters.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "search", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string" } },
            { in: "query", name: "ownerId", schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Project list returned." },
          },
        },
      },
      "/api/projects/{id}": {
        get: {
          tags: ["Project Management"],
          summary: "Get project",
          description: "Return a project with members, tasks, labels, and activity context.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Project returned." },
            "404": { description: "Project not found." },
          },
        },
        patch: {
          tags: ["Project Management"],
          summary: "Update project",
          description: "Update editable project metadata, ownership, status, and due dates.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ProjectCreateRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Project updated." },
          },
        },
      },
      "/api/tasks": {
        post: {
          tags: ["Project Management"],
          summary: "Create task",
          description: "Create a task or subtask for a project.",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskCreateRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Task created." },
          },
        },
        get: {
          tags: ["Project Management"],
          summary: "List tasks",
          description: "List tasks by project, assignee, status, and subtask visibility.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "projectId", schema: { type: "integer" } },
            { in: "query", name: "assigneeId", schema: { type: "integer" } },
            { in: "query", name: "status", schema: { type: "string" } },
            { in: "query", name: "includeSubtasks", schema: { type: "boolean" } },
          ],
          responses: {
            "200": { description: "Task list returned." },
          },
        },
      },
      "/api/tasks/{id}": {
        get: {
          tags: ["Project Management"],
          summary: "Get task",
          description: "Return a single task with comments, subtasks, labels, and activity.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Task returned." },
          },
        },
        patch: {
          tags: ["Project Management"],
          summary: "Update task",
          description: "Update editable task fields such as title, assignee, status, and due date.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskCreateRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Task updated." },
          },
        },
        delete: {
          tags: ["Project Management"],
          summary: "Delete task",
          description: "Delete a task and append an activity log entry for the removal.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          responses: {
            "204": { description: "Task deleted." },
          },
        },
      },
      "/api/tasks/{id}/move": {
        patch: {
          tags: ["Project Management"],
          summary: "Move task",
          description: "Move a task between kanban columns and update its sort order.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskMoveRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Task moved." },
          },
        },
      },
      "/api/tasks/{id}/comments": {
        get: {
          tags: ["Project Management"],
          summary: "List task comments",
          description: "Return the comment thread for a task.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Comments returned." },
          },
        },
        post: {
          tags: ["Project Management"],
          summary: "Create task comment",
          description: "Add a task comment and emit a realtime event to the project room.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TaskCommentRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Comment created." },
          },
        },
      },
      "/api/transfers/pending": {
        get: {
          tags: ["Transfers"],
          summary: "List pending transfers",
          description: "Return pending transfer requests visible to the current user or admin.",
          operationId: "listPendingTransfers",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Pending transfers returned." },
          },
        },
      },
      "/api/transfers/request": {
        post: {
          tags: ["Transfers"],
          summary: "Request lead transfer",
          description: "Create a lead transfer request or perform an immediate admin-owned transfer.",
          operationId: "requestTransfer",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            description: "Lead transfer payload.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/TransferRequest",
                },
              },
            },
          },
          responses: {
            "201": { description: "Transfer requested or completed." },
          },
        },
      },
      "/api/whatsapp/session/init": {
        post: {
          tags: ["WhatsApp"],
          summary: "Initialize WhatsApp session",
          description: "Bootstrap or reset the current user's WhatsApp session and trigger QR generation.",
          operationId: "initWhatsAppSession",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            description: "Optional force-reset controls for QR regeneration.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WhatsAppInitRequest",
                },
              },
            },
          },
          responses: {
            "200": { description: "Session init accepted." },
          },
        },
      },
      "/api/whatsapp/session/state": {
        get: {
          tags: ["WhatsApp"],
          summary: "Get WhatsApp session state",
          description: "Return the current QR payload and connection flags for the authenticated user.",
          operationId: "getWhatsAppSessionState",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "Session state payload." },
          },
        },
      },
    },
  };
}

function buildSwaggerHtml(openApiUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WhatsApp CRM API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #faf7f1; color: #17120d; }
      .topbar { display: none; }
      .docs-shell { max-width: 1200px; margin: 0 auto; padding: 28px 24px 0; }
      .docs-hero { margin-bottom: 18px; padding: 24px 28px; border: 1px solid #ded6c8; border-radius: 28px; background: linear-gradient(135deg, #fffdf8 0%, #f2ece2 100%); box-shadow: 0 18px 48px rgba(23, 18, 13, 0.08); }
      .docs-eyebrow { margin: 0; font-size: 11px; letter-spacing: 0.26em; text-transform: uppercase; color: #0f766e; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
      .docs-title { margin: 10px 0 0; font-size: 34px; line-height: 1.1; }
      .docs-copy { margin: 12px 0 0; max-width: 760px; font-size: 15px; line-height: 1.7; color: #57534e; }
      #swagger-ui { padding-bottom: 36px; }
    </style>
  </head>
  <body>
    <div class="docs-shell">
      <section class="docs-hero">
        <p class="docs-eyebrow">Backend API Docs</p>
        <h1 class="docs-title">WhatsApp CRM API Reference</h1>
        <p class="docs-copy">Browse grouped endpoints, read human-friendly descriptions, inspect request payloads, and test authenticated routes directly from Swagger UI.</p>
      </section>
    </div>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: "${openApiUrl}",
        dom_id: "#swagger-ui",
        deepLinking: true,
        persistAuthorization: true,
        defaultModelsExpandDepth: 1,
        docExpansion: "list",
        displayRequestDuration: true
      });
    </script>
  </body>
</html>`;
}

export const docsRouter = Router();

docsRouter.get("/openapi.json", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json(buildOpenApiDocument(baseUrl));
});

docsRouter.get("/docs", (req, res) => {
  const openApiUrl = `${req.protocol}://${req.get("host")}/openapi.json`;
  res.type("html").send(buildSwaggerHtml(openApiUrl));
});
