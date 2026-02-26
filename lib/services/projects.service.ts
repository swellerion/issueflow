import { db } from "@/lib/db";
import { ProjectRole } from "@/app/generated/prisma/enums";

const SLUG_REGEX = /^[a-z0-9-]+$/;
const DEFAULT_STATUSES = [
  { name: "Backlog", color: "#94a3b8", position: 0 },
  { name: "In Progress", color: "#6366f1", position: 1 },
  { name: "In Review", color: "#f59e0b", position: 2 },
  { name: "Done", color: "#22c55e", position: 3 },
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
        statuses: {
          create: DEFAULT_STATUSES,
        },
      },
      include: { statuses: { orderBy: { position: "asc" } } },
    });

    await tx.projectMembership.create({
      data: { projectId: project.id, userId, role: ProjectRole.ADMIN },
    });

    return project;
  });
}

export async function getProjects(userId: string, isSuperAdmin = false) {
  if (isSuperAdmin) {
    return db.project.findMany({
      orderBy: { createdAt: "asc" },
      include: { statuses: { orderBy: { position: "asc" } } },
    });
  }
  return db.project.findMany({
    where: { memberships: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    include: { statuses: { orderBy: { position: "asc" } } },
  });
}

export async function getProjectBySlug(slug: string) {
  return db.project.findUnique({
    where: { slug },
    include: { statuses: { orderBy: { position: "asc" } } },
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
  return db.projectMembership.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  });
}

export async function removeMember(projectId: string, userId: string) {
  return db.projectMembership.delete({
    where: { projectId_userId: { projectId, userId } },
  });
}

export async function promoteToSuperAdmin(userId: string) {
  return db.user.update({
    where: { id: userId },
    data: { isSuperAdmin: true },
  });
}
