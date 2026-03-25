import { db } from "@/lib/db";
import { LinkType } from "@/app/generated/prisma/enums";

const safeUserSelect = {
  id: true,
  username: true,
} as const;

export type CreateIssueInput = {
  title: string;
  description?: string;
  statusId: string;
  issueTypeId?: string;
  projectId: string;
  authorId: string;
  assigneeId?: string;
};

export type UpdateIssueInput = {
  statusId?: string;
  issueTypeId?: string;
  assigneeId?: string | null;
  title?: string;
  description?: string;
};

export async function createIssue(input: CreateIssueInput) {
  const title = input.title.trim();
  if (title.length < 1) {
    throw new Error("Issue title is required.");
  }
  if (title.length > 255) {
    throw new Error("Issue title must be 255 characters or fewer.");
  }

  return db.$transaction(async (tx) => {
    const project = await tx.project.findUnique({
      where: { id: input.projectId },
      select: { slug: true },
    });
    if (!project) throw new Error("Project not found.");

    const count = await tx.issue.count({ where: { projectId: input.projectId } });
    const identifier = `${project.slug.toUpperCase()}-${count + 1}`;

    return tx.issue.create({
      data: {
        identifier,
        title,
        description: input.description?.trim() || null,
        statusId: input.statusId,
        issueTypeId: input.issueTypeId ?? null,
        projectId: input.projectId,
        authorId: input.authorId,
        assigneeId: input.assigneeId ?? null,
        position: count,
      },
      include: {
        status: true,
        issueType: true,
        author: { select: safeUserSelect },
        assignee: { select: safeUserSelect },
      },
    });
  });
}

export async function getIssueById(id: string) {
  return db.issue.findUnique({
    where: { id },
    include: {
      status: true,
      author: { select: safeUserSelect },
      assignee: { select: safeUserSelect },
      comments: {
        include: { author: { select: safeUserSelect } },
        orderBy: { createdAt: "asc" },
      },
      issueType: true,
      project: {
        include: {
          statuses: { orderBy: { position: "asc" } },
          issueTypes: { orderBy: { position: "asc" } },
          statusTransitions: { select: { fromStatusId: true, toStatusId: true } },
        },
      },
      linksFrom: {
        include: {
          toIssue: { select: { id: true, identifier: true, title: true, status: { select: { name: true, color: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      linksTo: {
        include: {
          fromIssue: { select: { id: true, identifier: true, title: true, status: { select: { name: true, color: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function addIssueLink(fromIssueId: string, toIssueId: string, type: LinkType) {
  return db.issueLink.create({ data: { fromIssueId, toIssueId, type } });
}

export async function deleteIssueLink(linkId: string) {
  return db.issueLink.delete({ where: { id: linkId } });
}

export async function updateIssue(id: string, input: UpdateIssueInput) {
  return db.issue.update({
    where: { id },
    data: {
      ...(input.statusId !== undefined && { statusId: input.statusId }),
      ...(input.issueTypeId !== undefined && { issueTypeId: input.issueTypeId }),
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description || null }),
    },
    include: {
      status: true,
      issueType: true,
      author: { select: safeUserSelect },
      assignee: { select: safeUserSelect },
    },
  });
}

export async function isTransitionAllowed(
  projectId: string,
  workflowId: string | null,
  fromStatusId: string,
  toStatusId: string
): Promise<boolean> {
  if (!workflowId) return true;
  const transition = await db.statusTransition.findUnique({
    where: { projectId_fromStatusId_toStatusId: { projectId, fromStatusId, toStatusId } },
    select: { id: true },
  });
  return transition !== null;
}

export async function getProjectBoard(projectId: string) {
  const [project, issues] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: {
        statuses: { orderBy: { position: "asc" } },
        issueTypes: { orderBy: { position: "asc" } },
        statusTransitions: { select: { fromStatusId: true, toStatusId: true } },
      },
    }),
    db.issue.findMany({
      where: { projectId },
      include: {
        author: { select: safeUserSelect },
        assignee: { select: safeUserSelect },
        status: true,
        issueType: true,
        linksTo: { where: { type: LinkType.BLOCKS }, select: { id: true } },
      },
      orderBy: { position: "asc" },
    }),
  ]);

  return { project, issues };
}
