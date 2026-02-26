# IssueFlow

Lean issue tracking inspired by Jira. Kanban board, role-based access control, and a comment logbook — without the enterprise overhead.

## Features

- **Projects** — create projects with a unique slug; Kanban board per project
- **Issues** — create, move between columns (drag-and-drop), inline-edit title & description
- **Comments** — chronological activity logbook on each issue
- **RBAC** — per-project roles (ADMIN / MEMBER / VIEWER) + global Super-Admin flag
- **Settings** — member management page to add/remove users and change roles
- **Auth** — username + bcrypt password; session via Auth.js v5

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui · IONOS Design System |
| ORM | Prisma 7 |
| Database | PostgreSQL 17 |
| Auth | Auth.js v5 (next-auth beta) · bcryptjs |
| Drag & Drop | dnd-kit |
| Testing | Vitest (unit) · Playwright (E2E) |
| Container | Docker (multi-stage, node:22-alpine) |

## Prerequisites

- Node.js 22+
- Docker (or [Colima](https://github.com/abiosoft/colima) on macOS as a free alternative)
- npm

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — replace AUTH_SECRET with a real secret:
# openssl rand -base64 32

# 3. Start PostgreSQL
npm run db:up

# 4. Apply migrations and generate Prisma client
npm run db:migrate

# 5. Start dev server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and register your first user.

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://issueflow:issueflow@localhost:5432/issueflow` |
| `AUTH_SECRET` | Random secret for Auth.js session signing | output of `openssl rand -base64 32` |
| `AUTH_URL` | Canonical URL of the app | `http://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | Public-facing URL (for client-side redirects) | `http://localhost:3001` |

## Commands

```bash
# Development
npm run dev           # Next.js dev server (port 3001)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # ESLint

# Testing
npm run test          # Vitest unit tests (49 tests)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright E2E tests (20 tests)

# Database
npm run db:up         # Start PostgreSQL container
npm run db:down       # Stop PostgreSQL container
npm run db:migrate    # prisma migrate dev
npm run db:generate   # prisma generate
npm run db:studio     # Prisma Studio GUI
```

## Architecture

```
issueflow/
├── app/
│   ├── (auth)/              # Public routes: /login, /register
│   ├── (app)/               # Protected routes (session required)
│   │   ├── board/           # Kanban board
│   │   ├── issues/[id]/     # Issue detail
│   │   └── settings/members # Member management
│   ├── api/
│   │   ├── auth/            # Auth.js endpoints
│   │   └── v1/              # REST API (issues, comments, projects, members)
│   └── globals.css          # IONOS design tokens (OKLCH)
├── components/
│   ├── board/               # Board, Column, IssueCard (dnd-kit)
│   ├── issues/              # IssueDetail with inline editing
│   ├── settings/            # MembersForm
│   └── ui/                  # shadcn/ui primitives
├── lib/
│   ├── auth.ts              # Auth.js config
│   ├── db.ts                # Prisma singleton
│   ├── permissions.ts       # Pure RBAC logic (no DB, easily testable)
│   └── services/            # Business logic layer
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── unit/                # Vitest
    └── e2e/                 # Playwright
```

**Key design choices:**

- **Service layer** (`lib/services/`) — all DB access goes through typed service functions. API routes and Server Components call services, never Prisma directly.
- **Permissions as pure functions** (`lib/permissions.ts`) — no DB calls, easy to unit-test, no circular imports.
- **Server Components read data directly** via service functions (no extra HTTP round-trip for SSR).
- **REST API at `/api/v1/`** — versioned and ready for mobile clients or external integrations.
- **RBAC enforced server-side** — UI hiding (drag handle, inline edit) is defence-in-depth; the API always re-checks.

## RBAC Summary

| Action | VIEWER | MEMBER | ADMIN | Super-Admin |
|---|:---:|:---:|:---:|:---:|
| View board & issues | ✓ | ✓ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ | ✓ |
| Create issues | — | ✓ | ✓ | ✓ |
| Edit issues (inline) | — | ✓ | ✓ | ✓ |
| Drag issues between columns | — | ✓ | ✓ | ✓ |
| Manage members | — | — | ✓ | ✓ |
| Promote to Super-Admin | — | — | ✓ | ✓ |

## Testing

```bash
# Unit tests — no running server or DB needed
npm run test

# E2E tests — Playwright spins up the dev server automatically
# Requires: colima/Docker running + DB up (npm run db:up)
npm run test:e2e
```

## Deployment

The `Dockerfile` uses a three-stage build (deps → build → runner) on `node:22-alpine`. The production image runs as a non-root user and listens on port 3000.

Apply migrations before the first start:

```bash
docker run --rm \
  -e DATABASE_URL="postgresql://user:pass@host:5432/issueflow" \
  issueflow \
  npx prisma migrate deploy
```

Run the app:

```bash
docker build -t issueflow .

docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/issueflow" \
  -e AUTH_SECRET="<generated-secret>" \
  -e AUTH_URL="https://your-domain.example.com" \
  -e NEXT_PUBLIC_APP_URL="https://your-domain.example.com" \
  issueflow
```

For local development with Colima on macOS:

```bash
colima start      # start Docker runtime
npm run db:up     # start PostgreSQL
npm run dev       # start Next.js
```
