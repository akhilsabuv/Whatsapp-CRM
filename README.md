# WhatsApp-Integrated CRM

Local-first CRM built for sales teams that work from WhatsApp first and the browser second. The project runs with Docker Compose, persists PostgreSQL data and Baileys multi-file auth sessions, and includes real-time QR pairing, task reminders, lead transfer workflows, team chat, admin controls, and Redis-backed queueing/caching.

## What This Project Includes

- Next.js dashboard with:
  - login
  - workspace navigation
  - dashboard workload board
  - leads, customers, teams, projects, settings, and cron jobs views
  - QR pairing shield for WhatsApp reconnection
- Express + TypeScript backend with:
  - JWT auth
  - Prisma + PostgreSQL
  - Socket.io realtime bridge
  - Baileys multi-session WhatsApp manager
  - node-cron automation
  - Redis queueing and cache
  - Swagger/OpenAPI docs
- Persistent infrastructure for:
  - PostgreSQL data
  - Redis data
  - WhatsApp auth sessions in `apps/backend/sessions`

## Stack

- Frontend: Next.js App Router, React, Tailwind CSS, Lucide
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL + Prisma ORM
- WhatsApp engine: `@whiskeysockets/baileys`
- Realtime: Socket.io
- Scheduling: `node-cron`
- Queue and cache: Redis + BullMQ + ioredis
- Containers: Docker + Docker Compose

## Monorepo Layout

```text
.
├── docker-compose.yml
├── README.md
├── apps
│   ├── backend
│   │   ├── Dockerfile
│   │   ├── prisma
│   │   │   └── schema.prisma
│   │   ├── sessions
│   │   └── src
│   └── frontend
│       ├── Dockerfile
│       ├── app
│       └── components
```

## Core Concepts

### 1. WhatsApp sessions are persistent

Each user gets a Baileys multi-file session directory:

```text
apps/backend/sessions/user_[ID]
```

Those files are mounted into the backend container so QR login survives restarts.

### 2. The dashboard is realtime

The backend emits QR codes, connection state changes, and disconnect events over Socket.io. The frontend uses that to:

- show the QR pairing modal
- unlock the UI after connection
- re-lock the UI if WhatsApp disconnects

### 3. Scheduling is server-side

Briefings and reminders are not tied to a logged-in browser session. Cron runs in the backend, reads the stored user settings, and sends WhatsApp messages through the queue.

### 4. Heavy outbound messaging is queued

WhatsApp sends are pushed into Redis-backed BullMQ jobs so bursty sends from imports, transfers, reminders, and summaries do not block requests.

### 5. Reads are cached

Dashboard, lead detail/list, users, and transfer lists use short-lived Redis caching. Cache is invalidated on writes and on WhatsApp connection state changes.

## Implemented Features

### Authentication and access

- JWT login
- role-aware access (`ADMIN`, `USER`)
- dashboard lock screen when WhatsApp needs re-pairing

### Dashboard

- current workload board
- today’s scheduled actions
- briefing mirror
- quick metrics for leads, customers, due today, and pending transfers

### Leads

- searchable paginated list
- direct stage update from the table
- bulk selection and bulk transfer popup
- CSV/XLSX import
- sample CSV/XLSX download
- lead detail drawer with editable grouped sections
- actions, projects, transfers, message history

### Customers

- customer list view
- lead drawer reuse for customer detail

### Teams

- searchable paginated team list
- team member create flow
- team member edit drawer
- team availability widget
- left-side team chat dock
- teammate-to-teammate WhatsApp messaging

### Transfers

- transfer request flow
- admin approval queue
- direct admin transfer
- atomic reassignment of lead + pending actions

### Automation

- per-user briefing time
- per-user reminder offsets
- queued daily summaries
- queued reminder sends
- cron job logging
- admin cron jobs page

### Settings

- time zone
- currency
- automation timings
- global SMTP settings
- global kanban stages with custom stage support

### Docs and admin tools

- Swagger UI
- OpenAPI JSON
- health endpoint
- cron job log page

## Data Model

Main Prisma models in [schema.prisma](/Users/asv/Desktop/Projects/Codex%20test/crm/apps/backend/prisma/schema.prisma):

- `User`
- `Lead`
- `Action`
- `Transfer`
- `Project`
- `WhatsAppMessage`
- `TeamChatMessage`
- `CronJobLog`

Important user fields:

- `whatsappConnected`
- `needsReauth`
- `timeZone`
- `currency`
- `briefingTime`
- `firstReminderMinutes`
- `secondReminderMinutes`
- global SMTP settings
- global kanban stage JSON

Important lead fields:

- `status`
- `pipelineStage`
- assignment to `User`
- import/source metadata such as form/campaign/ad identifiers

## Services and Ports

Docker Compose currently exposes:

- Frontend: `http://localhost:3002`
- Backend API: `http://localhost:4000`
- Swagger UI: `http://localhost:4000/docs`
- OpenAPI JSON: `http://localhost:4000/openapi.json`
- Health check: `http://localhost:4000/health`
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

These values come from [docker-compose.yml](/Users/asv/Desktop/Projects/Codex%20test/crm/docker-compose.yml) and may be overridden by env vars.

## Prerequisites

- Docker Desktop or Docker Engine with Compose

Optional for running outside Docker:

- Node.js 20+
- npm 10+

## Production Deployment

The server deploy is managed by GitHub Actions. Pushes to `main` run `.github/workflows/deploy.yml`, which SSHes into the Ubuntu server, pulls the latest Git commit in `/opt/whatsapp-crm`, and restarts the Docker Compose stack.

See [GitHub Actions deployment](docs/github-actions-deploy.md) for the required repository secrets and variables.

## Environment

An example env file exists at [.env.example](/Users/asv/Desktop/Projects/Codex%20test/crm/.env.example).

Important variables:

- `DATABASE_URL`
- `REDIS_URL`
- `REDIS_CACHE_TTL_SECONDS`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `NEXT_PUBLIC_APP_NAME`

## Running the Project

From the repo root:

```bash
docker compose up --build
```

This starts:

- `postgres`
- `redis`
- `backend`
- `frontend`

The backend container currently runs:

```bash
npm install && npx prisma db push && npx prisma generate && npm run dev
```

The frontend container currently runs:

```bash
npm install && npm run dev
```

To stop:

```bash
docker compose down
```

To stop and remove persisted data:

```bash
docker compose down -v
```

## Persistence

Persistent storage configured in [docker-compose.yml](/Users/asv/Desktop/Projects/Codex%20test/crm/docker-compose.yml):

- `postgres_data` for PostgreSQL
- `redis_data` for Redis
- bind mount `./apps/backend/sessions:/app/sessions` for WhatsApp auth state

This means:

- database records survive restarts
- Redis survives restarts
- WhatsApp QR login does not need to happen after every container restart

## Default Accounts

The UI currently uses these local credentials in the login screen:

- `admin@crm.local / admin123`
- `rep@crm.local / rep123`

If you change the underlying seed/data, update the records in the database accordingly.

## Main Workflows

### WhatsApp pairing

1. Log in.
2. If `needsReauth = true`, the UI shows the connection shield.
3. Start or resume the QR session.
4. Scan the QR from WhatsApp Linked Devices.
5. Baileys stores the auth files under `apps/backend/sessions/user_[ID]`.
6. The backend updates `whatsappConnected = true` and `needsReauth = false`.

### Lead import

1. Open `Leads`.
2. Click `Import Leads`.
3. Upload CSV/XLSX.
4. The frontend normalizes rows and posts them to `/api/leads/import`.
5. Duplicate phone numbers are skipped.
6. Imported leads default to the importing admin when no valid assignee is present in the file.

### Lead transfer

1. Open a lead drawer or use bulk transfer from the leads table.
2. Select the destination teammate.
3. Admin transfer applies immediately.
4. User transfer creates a pending request for admin approval.
5. Accepting a transfer atomically reassigns the lead and all pending actions.

### Briefings and reminders

1. Each user has `briefingTime`, `firstReminderMinutes`, and `secondReminderMinutes`.
2. Cron runs every minute.
3. The scheduler queues:
   - one daily briefing after the configured briefing time
   - reminder messages after reminder thresholds are reached
4. Sent flags prevent duplicates.

## API Overview

The backend exposes these main groups:

- `/api/auth`
- `/api/dashboard`
- `/api/users`
- `/api/leads`
- `/api/actions`
- `/api/projects`
- `/api/transfers`
- `/api/whatsapp`
- `/api/admin`

Interactive documentation:

- Swagger UI: [http://localhost:4000/docs](http://localhost:4000/docs)
- OpenAPI JSON: [http://localhost:4000/openapi.json](http://localhost:4000/openapi.json)

## Important Backend Behaviors

### Dashboard scope

The dashboard is intended to reflect the current user’s workload, while broader team-wide visibility is available in the other admin views.

### Import ownership

When an admin imports leads without a valid `assignedToId` or `assignedToEmail`, the importer falls back to the importing admin as owner.

### Team availability badge

The availability widget is based on stored user status and cache. Connection changes invalidate cache so the badge stays aligned with Baileys session state.

### Cron reliability

Briefings and reminders use a catch-up model, not exact-minute matching. If the scheduler misses a minute under load, messages still send once the configured time has passed and the message has not already been sent.

## Local Development Without Docker

You can also run the apps directly.

Backend:

```bash
cd apps/backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Frontend:

```bash
cd apps/frontend
npm install
npm run dev
```

You will still need running PostgreSQL and Redis instances and valid env vars.

## Verification Commands

Useful checks:

```bash
npm --workspace apps/backend run build
npm --workspace apps/frontend run build
docker compose config
docker compose ps
docker compose logs -f backend
```

## Known Operational Notes

- The Compose dev containers currently run `npm install` on startup, which makes first boot slower than a production-optimized image.
- The frontend port defaults to `3002` in this repo.
- The Postgres host port defaults to `5433` in this repo.
- Imported lead ownership depends on the assignment fields present in the file.
- WhatsApp delivery depends on a valid connected Baileys session for the sending user.

## Future Improvements

- production Docker images without runtime `npm install`
- explicit database migrations instead of `db push` in container startup
- inbound WhatsApp sync into CRM conversations
- richer audit logs and delivery receipts
- file upload streaming for very large lead imports
