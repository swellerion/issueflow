import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIssueById, updateIssue } from "@/lib/services/issues.service";

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
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { statusId, assigneeId, title, description } = body as Record<string, unknown>;

  // Validate statusId belongs to the issue's project
  if (typeof statusId === "string") {
    const issue = await getIssueById(id);
    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }
    const validStatus = issue.project.statuses.find((s) => s.id === statusId);
    if (!validStatus) {
      return NextResponse.json({ error: "Invalid statusId for this project." }, { status: 422 });
    }
  }

  try {
    const updated = await updateIssue(id, {
      ...(typeof statusId === "string" && { statusId }),
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
