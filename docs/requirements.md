# IssueFlow — Requirements

## Problem Statement

Internal teams need a lightweight issue tracker for managing project work — minimal enough to avoid the overhead of Jira, powerful enough to cover a Kanban workflow, role-based access control, and a comment logbook. IssueFlow is that tool.

---

## Scope

**In scope (MVP — implemented):**

- Authentication (register / login / logout)
- Project creation with a unique slug
- Kanban board with configurable status columns
- Issue lifecycle (create, edit inline, move between columns, view detail)
- Comments as a chronological activity logbook
- Per-project role-based access control (ADMIN / MEMBER / VIEWER)
- Member management (add, remove, role change, promote to Super-Admin)
- IONOS-branded UI (design system tokens, Open Sans + Overpass fonts)
- Containerised deployment via Docker

**Out of scope (deferred):**

Priority fields, due dates, labels, file attachments, full-text search, real-time push updates, multi-tenancy UI (switch between orgs), SSO/OAuth, email notifications, API key auth, audit log, custom 404/error pages, loading skeletons.

---

## Functional Requirements

### Authentication

| ID | Requirement |
|---|---|
| AUTH-1 | Users can register with a unique username and password. Passwords are hashed with bcrypt before storage. |
| AUTH-2 | Users can log in with their username and password. A session is created via Auth.js (JWT strategy). |
| AUTH-3 | Users can sign out. The session is destroyed and the user is redirected to `/login`. |
| AUTH-4 | All routes under `/(app)/` require an active session. Unauthenticated requests redirect to `/login`. |
| AUTH-5 | `AUTH_SECRET` must be set to a non-empty value; the app throws on startup if it is missing. |

### Projects

| ID | Requirement |
|---|---|
| PROJ-1 | A user can create a project by providing a display name and a URL slug. The slug must be unique across all projects. |
| PROJ-2 | On project creation, four default statuses are created in order: Backlog, In Progress, In Review, Done. |
| PROJ-3 | The creating user is automatically added to the project as ADMIN (atomic transaction). |
| PROJ-4 | A user can only see projects they are a member of (any role). Super-Admins see all projects. |
| PROJ-5 | A user with no project memberships is redirected to the project creation page after login. |

### Issues

| ID | Requirement |
|---|---|
| ISS-1 | Issues can be created from any board column. Each issue receives a unique human-readable identifier of the form `<SLUG>-<N>` (e.g. `MYPROJ-1`). |
| ISS-2 | An issue has: title (required), description (optional, markdown plain-text), status, author, and an optional assignee. |
| ISS-3 | ADMIN and MEMBER users can edit the title inline on the issue detail page (click → input, blur or Enter to save, Escape to cancel). VIEWERs see a read-only heading. |
| ISS-4 | ADMIN and MEMBER users can edit the description inline. An empty description shows a "Click to add…" placeholder. VIEWERs see read-only text. |
| ISS-5 | ADMIN and MEMBER users can change the status and assignee via dropdowns. VIEWERs see static displays. |
| ISS-6 | `PATCH /api/v1/issues/:id` returns HTTP 403 if the caller is a VIEWER or not a member of the project. |
| ISS-7 | Issues are ordered by a numeric `position` field within each status column. |
| ISS-8 | The issue detail page shows: identifier, title, description, status, assignee, author, created/updated timestamps, and all comments. |

### Board

| ID | Requirement |
|---|---|
| BOARD-1 | The board displays all issues for the active project, grouped into status columns. |
| BOARD-2 | ADMIN and MEMBER users can drag issues between columns and within a column to reorder. VIEWERs do not see a drag handle. |
| BOARD-3 | A successful drag updates the issue's `statusId` and `position` via `PATCH /api/v1/issues/:id`. |
| BOARD-4 | The board is the default landing page for a logged-in user who has at least one project membership. |

### Comments

| ID | Requirement |
|---|---|
| CMT-1 | Any project member (including VIEWERs) can add a comment to an issue. |
| CMT-2 | Comments are displayed chronologically (oldest first). |
| CMT-3 | A comment requires a non-empty, non-whitespace body. The submit button is disabled for whitespace-only input. |

---

## Role-Based Access Control

### Roles

| Role | Scope | Description |
|---|---|---|
| `VIEWER` | Per-project | Read issues and add comments. Cannot edit or create issues. |
| `MEMBER` | Per-project | Create and edit issues (title, description, status, assignee, drag). Cannot manage members. |
| `ADMIN` | Per-project | All MEMBER permissions plus manage project membership (add, remove, change roles, promote to Super-Admin). |
| `isSuperAdmin` | Global (User flag) | Bypasses all project-level role checks. Effectively ADMIN on every project. |

### Access Matrix

| Action | VIEWER | MEMBER | ADMIN | Super-Admin |
|---|:---:|:---:|:---:|:---:|
| View board & issues | ✓ | ✓ | ✓ | ✓ |
| Add comments | ✓ | ✓ | ✓ | ✓ |
| Create issues | — | ✓ | ✓ | ✓ |
| Edit issue title / description | — | ✓ | ✓ | ✓ |
| Change issue status / assignee | — | ✓ | ✓ | ✓ |
| Drag issues between columns | — | ✓ | ✓ | ✓ |
| Add members to project | — | — | ✓ | ✓ |
| Remove members | — | — | ✓ | ✓ |
| Change member roles | — | — | ✓ | ✓ |
| Promote user to Super-Admin | — | — | ✓ | ✓ |

### Invariants

- A project must always have at least one ADMIN. Removing or demoting the last ADMIN returns HTTP 422.
- Project creator is always added as ADMIN on creation (single DB transaction — no orphan projects).
- Role checks are enforced server-side on every API mutation. UI-level hiding is defence-in-depth only.

### Member Management

| ID | Requirement |
|---|---|
| MEM-1 | Project ADMINs and Super-Admins can access `/settings/members` to see all project members and their roles. |
| MEM-2 | ADMINs can add a user by username + role. Returns 404 if the username doesn't exist; 409 if already a member. |
| MEM-3 | ADMINs can change the role of any member (except the last ADMIN — returns 422). |
| MEM-4 | ADMINs can remove any member except the last ADMIN (422). |
| MEM-5 | ADMINs can promote any user to Super-Admin (`isSuperAdmin = true` on the User record). |
| MEM-6 | The "Settings" nav link is only shown to users with ADMIN role or Super-Admin flag in the current project. |

---

## API Reference

All endpoints require an active session. All paths are prefixed `/api/v1/`.

### Issues

| Method | Path | Body | Status | Notes |
|---|---|---|---|---|
| GET | `/issues` | — | 200 | All issues; query `?projectId=` |
| POST | `/issues` | `{ title, statusId, projectId, assigneeId? }` | 201 | Auto-generates identifier |
| PATCH | `/issues/:id` | `{ title?, description?, statusId?, assigneeId?, position? }` | 200 | 403 for VIEWERs |

### Comments

| Method | Path | Body | Status | Notes |
|---|---|---|---|---|
| GET | `/comments` | — | 200 | Query `?issueId=` |
| POST | `/comments` | `{ body, issueId }` | 201 | Any member including VIEWERs |

### Projects

| Method | Path | Body | Status | Notes |
|---|---|---|---|---|
| POST | `/projects` | `{ name, slug }` | 201 | Creates project + default statuses + ADMIN membership |

### Members

| Method | Path | Body | Status | Notes |
|---|---|---|---|---|
| GET | `/projects/:id/members` | — | 200 | Any project member |
| POST | `/projects/:id/members` | `{ username, role }` | 201 | ADMIN+ only; 404/409 guards |
| PATCH | `/projects/:id/members/:userId` | `{ role? } \| { isSuperAdmin: true }` | 200 | ADMIN+ only |
| DELETE | `/projects/:id/members/:userId` | — | 204 | ADMIN+ only; 422 if last ADMIN |

---

## Data Model

```
User
  id           cuid PK
  username     string UNIQUE
  passwordHash string
  isSuperAdmin boolean DEFAULT false
  createdAt    datetime

Project
  id        cuid PK
  name      string
  slug      string UNIQUE
  ownerId   FK → User
  createdAt datetime

ProjectMembership
  id        cuid PK
  projectId FK → Project (CASCADE DELETE)
  userId    FK → User (CASCADE DELETE)
  role      ADMIN | MEMBER | VIEWER
  createdAt datetime
  UNIQUE(projectId, userId)

Status
  id        cuid PK
  name      string
  color     string (hex)
  position  int
  projectId FK → Project (CASCADE DELETE)
  UNIQUE(projectId, position)
  UNIQUE(projectId, name)

Issue
  id          cuid PK
  identifier  string UNIQUE   -- e.g. MYPROJ-1
  title       string
  description string?
  position    int DEFAULT 0
  projectId   FK → Project (CASCADE DELETE)
  statusId    FK → Status
  authorId    FK → User
  assigneeId  FK → User (nullable)
  createdAt   datetime
  updatedAt   datetime

Comment
  id        cuid PK
  body      string
  issueId   FK → Issue (CASCADE DELETE)
  authorId  FK → User
  createdAt datetime
```

---

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Passwords are stored as bcrypt hashes. Plaintext passwords are never logged or persisted. |
| NFR-2 | All API mutations validate the session and re-check permissions server-side before executing. |
| NFR-3 | `AUTH_SECRET` must be a cryptographically random value (≥ 32 bytes) in any non-local environment. |
| NFR-4 | The app is fully containerisable via the included multi-stage `Dockerfile` (node:22-alpine, non-root user). |
| NFR-5 | Unit tests cover all service functions and permission logic. E2E tests cover all major user flows including RBAC enforcement. |
| NFR-6 | TypeScript strict mode is enabled; the production build must complete without type errors. |
