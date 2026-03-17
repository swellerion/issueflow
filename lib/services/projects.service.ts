import { db } from "@/lib/db";
import { ProjectRole, StatusCategory } from "@/app/generated/prisma/enums";

const SLUG_REGEX = /^[a-z0-9-]+$/;
const RESERVED_SLUGS = ["admin", "api", "login", "register", "projects"];
const DEFAULT_STATUSES = [
  { name: "Backlog",     color: "#94a3b8", position: 0, category: StatusCategory.TODO },
  { name: "In Progress", color: "#6366f1", position: 1, category: StatusCategory.IN_PROGRESS },
  { name: "In Review",   color: "#f59e0b", position: 2, category: StatusCategory.IN_PROGRESS },
  { name: "Done",        color: "#22c55e", position: 3, category: StatusCategory.DONE },
];
const DEFAULT_ISSUE_TYPES = [
  { name: "Task", icon: "check-square-2", color: "#6366f1", position: 0 },
  { name: "Bug", icon: "bug", color: "#ef4444", position: 1 },
  { name: "Feature", icon: "sparkles", color: "#22c55e", position: 2 },
  { name: "Story", icon: "book-open", color: "#f59e0b", position: 3 },
];

export type CreateProjectInput = {
  name: string;
  slug: string;
  userId: string;
};

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();
  const { userId } = input;

  if (name.length < 2) {
    throw new Error("Project name must be at least 2 characters.");
  }

  if (!SLUG_REGEX.test(slug) || slug.length < 2 || slug.length > 20) {
    throw new Error(
      "Slug must be 2–20 lowercase letters, numbers, or hyphens."
    );
  }

  if (RESERVED_SLUGS.includes(slug)) {
    throw new Error(`"${slug}" is a reserved slug and cannot be used.`);
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.project.findUnique({ where: { slug } });
    if (existing) {
      throw new Error("A project with this slug already exists.");
    }

    const project = await tx.project.create({
      data: {
        name,
        slug,
        ownerId: userId,
        statuses: { create: DEFAULT_STATUSES },
        issueTypes: { create: DEFAULT_ISSUE_TYPES },
      },
      include: {
        statuses: { orderBy: { position: "asc" } },
        issueTypes: { orderBy: { position: "asc" } },
      },
    });

    await tx.projectMembership.create({
      data: { projectId: project.id, userId, role: ProjectRole.ADMIN },
    });

    return project;
  });
}

export async function getProjects(userId: string, isSuperAdmin = false) {
  const include = {
    statuses: { orderBy: { position: "asc" } },
    issueTypes: { orderBy: { position: "asc" } },
  } as const;
  if (isSuperAdmin) {
    return db.project.findMany({ orderBy: { createdAt: "asc" }, include });
  }
  return db.project.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    include,
  });
}

export async function getProjectBySlug(slug: string) {
  return db.project.findUnique({
    where: { slug },
    include: {
      statuses: { orderBy: { position: "asc" } },
      issueTypes: { orderBy: { position: "asc" } },
    },
  });
}

export async function getProjectById(id: string) {
  return db.project.findUnique({
    where: { id },
    include: {
      statuses: { orderBy: { position: "asc" } },
      issueTypes: { orderBy: { position: "asc" } },
    },
  });
}

export async function getMembership(projectId: string, userId: string) {
  return db.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
}

export async function getMembers(projectId: string) {
  return db.projectMembership.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, username: true, isSuperAdmin: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addMember(projectId: string, userId: string, role: ProjectRole) {
  return db.projectMembership.create({
    data: { projectId, userId, role },
  });
}

export async function updateMemberRole(projectId: string, userId: string, role: ProjectRole) {
  if (role !== ProjectRole.ADMIN) {
    const current = await db.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });
    if (current?.role === ProjectRole.ADMIN) {
      const adminCount = await db.projectMembership.count({
        where: { projectId, role: ProjectRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new Error("Cannot remove the last admin from a project.");
      }
    }
  }
  return db.projectMembership.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  });
}

export async function removeMember(projectId: string, userId: string) {
  const current = await db.projectMembership.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  });
  if (current?.role === ProjectRole.ADMIN) {
    const adminCount = await db.projectMembership.count({
      where: { projectId, role: ProjectRole.ADMIN },
    });
    if (adminCount <= 1) {
      throw new Error("Cannot remove the last admin from a project.");
    }
  }
  return db.projectMembership.delete({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function adoptWorkflow(projectId: string, workflowId: string) {
  return db.$transaction(async (tx) => {
    const [workflow, project] = await Promise.all([
      tx.workflow.findUnique({
        where: { id: workflowId },
        include: { states: true, transitions: true },
      }),
      tx.project.findUnique({
        where: { id: projectId },
        include: { statuses: true },
      }),
    ]);
    if (!workflow) throw new Error("Workflow not found.");
    if (!project) throw new Error("Project not found.");

    // Match workflow states to project statuses by name (case-insensitive)
    const statusByName = new Map(
      project.statuses.map((s) => [s.name.toLowerCase(), s])
    );
    const unmatched: string[] = [];
    const stateToStatus = new Map<string, string>(); // workflowStateId → statusId

    for (const state of workflow.states) {
      const status = statusByName.get(state.name.toLowerCase());
      if (status) {
        stateToStatus.set(state.id, status.id);
      } else {
        unmatched.push(state.name);
      }
    }

    // Delete existing StatusTransitions for this project
    await tx.statusTransition.deleteMany({ where: { projectId } });

    // Insert matched transitions
    const transitionData: { projectId: string; fromStatusId: string; toStatusId: string }[] = [];
    for (const wt of workflow.transitions) {
      const fromStatusId = stateToStatus.get(wt.fromStateId);
      const toStatusId = stateToStatus.get(wt.toStateId);
      if (fromStatusId && toStatusId) {
        transitionData.push({ projectId, fromStatusId, toStatusId });
      }
    }

    if (transitionData.length > 0) {
      await tx.statusTransition.createMany({ data: transitionData, skipDuplicates: true });
    }

    await tx.project.update({ where: { id: projectId }, data: { workflowId } });

    return { unmatched };
  });
}

export async function detachWorkflow(projectId: string) {
  return db.$transaction(async (tx) => {
    await tx.statusTransition.deleteMany({ where: { projectId } });
    await tx.project.update({ where: { id: projectId }, data: { workflowId: null } });
  });
}

export async function createStatus(
  projectId: string,
  input: { name: string; color?: string; category?: StatusCategory }
) {
  const name = input.name.trim();
  if (!name) throw new Error("Status name is required.");
  const max = await db.status.aggregate({
    where: { projectId },
    _max: { position: true },
  });
  const position = (max._max.position ?? -1) + 1;
  return db.status.create({
    data: {
      projectId,
      name,
      color: input.color ?? "#6366f1",
      position,
      category: input.category ?? StatusCategory.TODO,
    },
  });
}

export async function updateStatus(
  statusId: string,
  input: { name?: string; color?: string; position?: number; category?: StatusCategory }
) {
  return db.status.update({
    where: { id: statusId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.category !== undefined && { category: input.category }),
    },
  });
}

export async function deleteStatus(statusId: string) {
  const issueCount = await db.issue.count({ where: { statusId } });
  if (issueCount > 0) {
    throw new Error("Cannot delete a status that has issues assigned to it.");
  }
  return db.status.delete({ where: { id: statusId } });
}

export async function promoteToSuperAdmin(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { isSuperAdmin: true },
  });
}

export async function getProjectsWithStats() {
  return db.project.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { memberships: true, issues: true } },
    },
  });
}
