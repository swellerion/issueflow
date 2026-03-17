import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership, getProjects } from "@/lib/services/projects.service";
import { createWorkflow, getWorkflows } from "@/lib/services/workflows.service";
import { ProjectRole } from "@/app/generated/prisma/enums";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const workflows = await getWorkflows();
  return NextResponse.json(workflows);
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

  const { name, description } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Workflow name is required." }, { status: 422 });
  }

  // Must be superadmin or admin of at least one project
  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  if (!isSuperAdmin) {
    const userId = session.user.id;
    const projects = await getProjects(userId);
    const memberships = await Promise.all(
      projects.map((p) => getMembership(p.id, userId))
    );
    const hasAdminRole = memberships.some((m) => m?.role === ProjectRole.ADMIN);
    if (!hasAdminRole) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  try {
    const workflow = await createWorkflow({
      name: name.trim(),
      description: typeof description === "string" ? description : undefined,
      createdById: session.user.id,
    });
    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
