import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership, adoptWorkflow, detachWorkflow } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

async function assertAdmin(projectId: string, userId: string): Promise<boolean> {
  const [membership, flags] = await Promise.all([
    getMembership(projectId, userId),
    getUserFlags(userId),
  ]);
  return canManageMembers(membership?.role ?? null, flags?.isSuperAdmin ?? false);
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId } = await params;

  if (!(await assertAdmin(projectId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { workflowId } = body as Record<string, unknown>;
  if (typeof workflowId !== "string" || !workflowId.trim()) {
    return NextResponse.json({ error: "workflowId is required." }, { status: 422 });
  }

  try {
    const result = await adoptWorkflow(projectId, workflowId.trim());
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId } = await params;

  if (!(await assertAdmin(projectId, session.user.id))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await detachWorkflow(projectId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
