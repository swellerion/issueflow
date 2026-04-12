# IssueFlow

Lean issue tracking inspired by Jira. Kanban board with workflow automation, role-based access control, and a rich-text comment logbook — without the enterprise overhead.

## Features

- **Multi-tenant projects** — each project has a unique slug; all routes scoped under `/{slug}/`
- **Kanban board** — drag-and-drop with workflow-enforced transition guards; columns grouped by category (TODO / IN_PROGRESS / DONE)
- **Board filters** — search by title/identifier, filter by assignee or issue type; client-side, DnD unaffected
- **Issues** — create with type, status, assignee; inline-edit title, description (rich text), status, type, assignee
- **Issue types** — configurable per project (Bug, Task, Feature, Story, …) with icon + color
- **Issue links** — BLOCKS / IS_BLOCKED_BY / RELATES_TO relationships between issues
- **Rich text** — Tiptap editor (bold, italic, lists, …) for descriptions and comments; DOMPurify sanitized on read
- **Comments** — rich-text activity logbook; authors and admins can delete their own/any comment
- **Workflows** — visual canvas (React Flow) to define statuses and allowed transitions; board enforces transitions client + server-side
- **Status categories** — every status maps to TODO / IN_PROGRESS / DONE; drives board column grouping
- **RBAC** — per-project roles (ADMIN / MEMBER / VIEWER) + global Super-Admin flag
- **Settings** — member management, custom statuses, workflow assignment per project
- **Super-Admin dashboard** — `/admin` lists all projects with member/issue counts
- **Auth** — username + bcrypt password; session via Auth.js v5

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) · TypeScript |
| Styling | Tailwind CSS v4 · shadcn/ui · IONOS Design System |
| ORM | Prisma 6 |
| Database | PostgreSQL 17 |
| Auth | Auth.js v5 (next-auth beta) · bcryptjs |
| Drag & Drop | dnd-kit |
| Rich Text | Tiptap (StarterKit + Placeholder) · isomorphic-dompurify |
| Workflow Canvas | @xyflow/react (React Flow) |
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

Open [http://localhost:3001](http://localhost:3001) and register your first user. The first user to be promoted via the admin panel becomes Super-Admin.

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
npm run test          # Vitest unit tests (105 tests)
npm run test:watch    # Vitest watch mode
npm run test:e2e      # Playwright E2E tests

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
│   ├── (auth)/                    # Public routes: /login, /register
│   ├── (app)/[slug]/              # Protected, tenant-scoped routes
│   │   ├── board/                 # Kanban board
│   │   ├── issues/[id]/           # Issue detail
│   │   └── settings/
│   │       ├── members/           # Member management
│   │       ├── statuses/          # Custom statuses
│   │       └── workflow/          # Workflow assignment
│   ├── admin/                     # Super-Admin dashboard
│   ├── workflows/                 # Workflow canvas editor
│   │   └── [id]/
│   ├── api/
│   │   ├── auth/                  # Auth.js endpoints
│   │   └── v1/                    # REST API
│   │       ├── issues/[id]/
│   │       │   └── comments/[commentId]/
│   │       ├── projects/[id]/
│   │       │   ├── statuses/
│   │       │   └── workflow/
│   │       └── workflows/[id]/
│   └── globals.css                # IONOS design tokens + rich-text prose styles
├── components/
│   ├── board/                     # Board, CategoryColumn, Column, IssueCard, IssuePanel, BoardFilters
│   ├── issues/                    # IssueDetail, NewIssueForm
│   ├── settings/                  # MembersForm, StatusesForm, WorkflowSettingsForm
│   ├── workflows/                 # WorkflowCanvas, WorkflowNode, WorkflowToolbar
│   └── ui/                        # shadcn/ui primitives + RichTextEditor/Viewer
├── lib/
│   ├── auth.ts                    # Auth.js config
│   ├── db.ts                      # Prisma singleton
│   ├── permissions.ts             # Pure RBAC logic (no DB, easily testable)
│   ├── allowed-transitions.ts     # isTransitionAllowed() shared by board + columns
│   ├── board-filters.ts           # filterIssues(), hasActiveFilters(), EMPTY_FILTERS
│   ├── rich-text.ts               # isRichTextEmpty()
│   ├── status-category.ts         # StatusCategory enum + getCategoryMeta() (no Prisma import)
│   └── services/                  # Business logic layer
│       ├── issues.service.ts
│       ├── projects.service.ts
│       ├── users.service.ts
│       ├── comments.service.ts
│       └── workflows.service.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
└── tests/
    ├── unit/                      # Vitest
    └── e2e/                       # Playwright
```

**Key design choices:**

- **Service layer** (`lib/services/`) — all DB access goes through typed service functions. API routes and Server Components call services, never Prisma directly.
- **Permissions as pure functions** (`lib/permissions.ts`) — no DB calls, easy to unit-test, no circular imports. `canEditIssue`, `canDeleteComment`, `canPromoteToSuperAdmin`.
- **Shared utilities** — `lib/allowed-transitions.ts` and `lib/board-filters.ts` are imported by both server and client code; no Prisma imports so they're safe in Client Components.
- **Server Components read data directly** via service functions (no extra HTTP round-trip for SSR).
- **REST API at `/api/v1/`** — versioned and ready for mobile clients or external integrations.
- **RBAC enforced server-side** — UI hiding is defence-in-depth; the API always re-checks.
- **Workflow transitions** — `isTransitionAllowed()` short-circuits to `true` when a project has no workflow assigned, so existing projects without workflows are unaffected.
- **Multi-tenancy** — tenant gate in `[slug]/layout.tsx`: `getProjectBySlug` → `getMembership` → 404 if not member. All project-scoped routes are under `/{slug}/`.

## RBAC Summary

| Action | VIEWER | MEMBER | ADMIN | Super-Admin |
|---|:---:|:---:|:---:|:---:|
| View board & issues | ✓ | ✓ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ | ✓ |
| Delete own comments | ✓ | ✓ | ✓ | ✓ |
| Create issues | — | ✓ | ✓ | ✓ |
| Edit issues (inline) | — | ✓ | ✓ | ✓ |
| Drag issues between columns | — | ✓ | ✓ | ✓ |
| Delete any comment | — | — | ✓ | ✓ |
| Manage members / statuses | — | — | ✓ | ✓ |
| Manage workflows | — | — | ✓ | ✓ |
| Promote to Super-Admin | — | — | ✓ | ✓ |
| View all projects (admin dash) | — | — | — | ✓ |

## Reserved Slugs

The following slugs cannot be used as project identifiers: `admin`, `api`, `login`, `register`, `projects`.

## Testing

```bash
# Unit tests — no running server or DB needed
npm run test

# E2E tests — Playwright spins up the dev server automatically
# Requires: colima/Docker running + DB up (npm run db:up)
npm run test:e2e
```

Unit test coverage: services (projects, issues, users, comments, workflows), permissions, board filters, rich-text utilities, workflow transitions.

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
