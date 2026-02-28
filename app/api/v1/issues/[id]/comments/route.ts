import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createComment } from "@/lib/services/comments.service";
import { getIssueById } from "@/lib/services/issues.service";
import { getMembership } from "@/lib/services/projects.service";
import { getUserFlags } from "@/lib/services/users.service";
import { canEditIssue } from "@/lib/permissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: issueId } = await params;

  const issue = await getIssueById(issueId);
  if (!issue) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  const [membership, userFlags] = await Promise.all([
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canEditIssue(membership?.role ?? null, userFlags?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { body: commentBody } = body as Record<string, unknown>;

  if (typeof commentBody !== "string") {
    return NextResponse.json({ error: "body is required." }, { status: 400 });
  }

  try {
    const comment = await createComment({
      body: commentBody,
      issueId,
      authorId: session.user.id,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add comment.";
    if (message === "Comment body is required." || message === "Issue not found.") {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[POST /api/v1/issues/:id/comments]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
