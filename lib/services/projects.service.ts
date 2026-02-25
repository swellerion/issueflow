import { db } from "@/lib/db";

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
};

export async function createProject(input: CreateProjectInput) {
  const name = input.name.trim();
  const slug = input.slug.trim().toLowerCase();

  if (name.length < 2) {
    throw new Error("Project name must be at least 2 characters.");
  }

  if (!SLUG_REGEX.test(slug) || slug.length < 2 || slug.length > 20) {
    throw new Error(
      "Slug must be 2–20 lowercase letters, numbers, or hyphens."
    );
  }

  const existing = await db.project.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("A project with this slug already exists.");
  }

  const project = await db.project.create({
    data: {
      name,
      slug,
      statuses: {
        create: DEFAULT_STATUSES,
      },
    },
    include: { statuses: { orderBy: { position: "asc" } } },
  });

  return project;
}

export async function getProjects() {
  return db.project.findMany({
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
