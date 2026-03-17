import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import {
  getWorkflowById,
  updateWorkflowCanvas,
  deleteWorkflow,
  type CanvasStateInput,
  type CanvasTransitionInput,
} from "@/lib/services/workflows.service";
import { CATEGORY_VALUES } from "@/lib/status-category";

type Params = { params: Promise<{ id: string }> };

async function isOwnerOrSuperAdmin(
  workflowCreatedById: string,
  userId: string
): Promise<boolean> {
  if (workflowCreatedById === userId) return true;
  const flags = await getUserFlags(userId);
  return flags?.isSuperAdmin ?? false;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;
  const workflow = await getWorkflowById(id);
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }
  return NextResponse.json(workflow);
}

export async function PUT(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id } = await params;

  const workflow = await getWorkflowById(id);
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  if (!(await isOwnerOrSuperAdmin(workflow.createdById, session.user.id))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { states, transitions } = body as Record<string, unknown>;
  if (!Array.isArray(states) || !Array.isArray(transitions)) {
    return NextResponse.json({ error: "states and transitions must be arrays." }, { status: 422 });
  }

  for (const s of states) {
    if (typeof s !== "object" || s === null) {
      return NextResponse.json({ error: "Each state must be an object." }, { status: 422 });
    }
    const st = s as Record<string, unknown>;
    if (typeof st.id !== "string" || !st.id.trim()) {
      return NextResponse.json({ error: "Each state must have a non-empty string id." }, { status: 422 });
    }
    if (typeof st.name !== "string" || !st.name.trim()) {
      return NextResponse.json({ error: "Each state must have a non-empty string name." }, { status: 422 });
    }
    if (typeof st.color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(st.color)) {
      return NextResponse.json({ error: `State "${st.id}" has an invalid color (expected #rrggbb).` }, { status: 422 });
    }
    if (!(CATEGORY_VALUES as string[]).includes(st.category as string)) {
      return NextResponse.json({ error: `State "${st.id}" has an invalid category.` }, { status: 422 });
    }
    if (
      typeof st.positionX !== "number" || !isFinite(st.positionX) ||
      typeof st.positionY !== "number" || !isFinite(st.positionY)
    ) {
      return NextResponse.json({ error: `State "${st.id}" has invalid position values.` }, { status: 422 });
    }
  }

  try {
    const updated = await updateWorkflowCanvas(
      id,
      states as CanvasStateInput[],
      transitions as CanvasTransitionInput[]
    );
    return NextResponse.json(updated);
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
  const { id } = await params;

  const workflow = await getWorkflowById(id);
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  }

  if (!(await isOwnerOrSuperAdmin(workflow.createdById, session.user.id))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await deleteWorkflow(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
