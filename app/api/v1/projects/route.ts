import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createProject, getProjects } from "@/lib/services/projects.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const projects = await getProjects(session.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[GET /api/v1/projects]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

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

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).name !== "string" ||
    typeof (body as Record<string, unknown>).slug !== "string"
  ) {
    return NextResponse.json(
      { error: "name and slug are required." },
      { status: 400 }
    );
  }

  const { name, slug } = body as { name: string; slug: string };

  try {
    const project = await createProject({ name, slug, userId: session.user.id });
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project.";

    if (message === "A project with this slug already exists.") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (
      message.startsWith("Project name") ||
      message.startsWith("Slug must")
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    console.error("[POST /api/v1/projects]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
