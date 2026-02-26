import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createIssue } from "@/lib/services/issues.service";
import { getProjects } from "@/lib/services/projects.service";

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

  const { title, description, statusId, assigneeId } = body as Record<string, unknown>;

  if (typeof title !== "string" || typeof statusId !== "string") {
    return NextResponse.json({ error: "title and statusId are required." }, { status: 400 });
  }

  const projects = await getProjects(session.user.id);
  if (projects.length === 0) {
    return NextResponse.json({ error: "No project found." }, { status: 404 });
  }

  const project = projects[0];
  const validStatus = project.statuses.find((s) => s.id === statusId);
  if (!validStatus) {
    return NextResponse.json({ error: "Invalid statusId." }, { status: 422 });
  }

  try {
    const issue = await createIssue({
      title,
      description: typeof description === "string" ? description : undefined,
      statusId,
      projectId: project.id,
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
