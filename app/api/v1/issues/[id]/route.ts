import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIssueById, updateIssue, isTransitionAllowed } from "@/lib/services/issues.service";
import { getMembership } from "@/lib/services/projects.service";
import { getUserFlags } from "@/lib/services/users.service";
import { canEditIssue } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  return NextResponse.json(issue);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { statusId, issueTypeId, assigneeId, title, description } = body as Record<string, unknown>;

  // Fetch issue first so we can check project membership
  const issue = await getIssueById(id);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const [membership, currentUser] = await Promise.all([
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canEditIssue(membership?.role ?? null, currentUser?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Validate statusId belongs to the issue's project
  if (typeof statusId === "string") {
    const validStatus = issue.project.statuses.find((s) => s.id === statusId);
    if (!validStatus) {
      return NextResponse.json({ error: "Invalid statusId for this project." }, { status: 422 });
    }

    // Enforce workflow transition rules when a workflow is adopted
    if (statusId !== issue.statusId && issue.project.workflowId) {
      const allowed = await isTransitionAllowed(
        issue.projectId,
        issue.project.workflowId,
        issue.statusId,
        statusId
      );
      if (!allowed) {
        console.warn("[workflow] blocked transition", {
          issueId: id,
          from: issue.statusId,
          to: statusId,
        });
        return NextResponse.json(
          { error: "This status transition is not allowed by the project workflow." },
          { status: 422 }
        );
      }
    }
  }

  // Validate issueTypeId belongs to the issue's project
  if (typeof issueTypeId === "string") {
    const validType = issue.project.issueTypes.find((t) => t.id === issueTypeId);
    if (!validType) {
      return NextResponse.json({ error: "Invalid issueTypeId for this project." }, { status: 422 });
    }
  }

  try {
    const updated = await updateIssue(id, {
      ...(typeof statusId === "string" && { statusId }),
      ...(typeof issueTypeId === "string" && { issueTypeId }),
      ...(assigneeId === null || typeof assigneeId === "string"
        ? { assigneeId: assigneeId as string | null }
        : {}),
      ...(typeof title === "string" && { title }),
      ...(typeof description === "string" && { description }),
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/v1/issues/:id]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
