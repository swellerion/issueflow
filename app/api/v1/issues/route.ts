import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createIssue } from "@/lib/services/issues.service";
import { getProjectById, getMembership } from "@/lib/services/projects.service";
import { getUserFlags } from "@/lib/services/users.service";
import { canEditIssue } from "@/lib/permissions";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { title, description, statusId, issueTypeId, assigneeId, projectId } = body as Record<string, unknown>;

  if (typeof title !== "string" || typeof statusId !== "string" || typeof projectId !== "string") {
    return NextResponse.json({ error: "title, statusId, and projectId are required." }, { status: 400 });
  }

  const [project, membership, userFlags] = await Promise.all([
    getProjectById(projectId),
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  if (!canEditIssue(membership?.role ?? null, isSuperAdmin)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const validStatus = project.statuses.find((s) => s.id === statusId);
  if (!validStatus) {
    return NextResponse.json({ error: "Invalid statusId." }, { status: 422 });
  }

  if (typeof issueTypeId === "string") {
    const validType = project.issueTypes.find((t) => t.id === issueTypeId);
    if (!validType) {
      return NextResponse.json({ error: "Invalid issueTypeId." }, { status: 422 });
    }
  }

  try {
    const issue = await createIssue({
      title,
      description: typeof description === "string" ? description : undefined,
      statusId,
      issueTypeId: typeof issueTypeId === "string" ? issueTypeId : undefined,
      projectId,
      authorId: session.user.id,
      assigneeId: typeof assigneeId === "string" ? assigneeId : undefined,
    });
    return NextResponse.json(issue, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create issue.";
    if (message === "Issue title is required." || message.startsWith("Issue title must")) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[POST /api/v1/issues]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
