import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership, updateStatus, deleteStatus } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { isValidCategory } from "@/lib/status-category";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; statusId: string }> };

async function assertAdminAndStatus(
  projectId: string,
  statusId: string,
  userId: string
) {
  const [membership, flags, status] = await Promise.all([
    getMembership(projectId, userId),
    getUserFlags(userId),
    db.status.findUnique({ where: { id: statusId }, select: { projectId: true } }),
  ]);
  if (!canManageMembers(membership?.role ?? null, flags?.isSuperAdmin ?? false)) {
    return { allowed: false, status: null } as const;
  }
  if (!status || status.projectId !== projectId) {
    return { allowed: false, status: null } as const;
  }
  return { allowed: true, status } as const;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId, statusId } = await params;

  const { allowed } = await assertAdminAndStatus(projectId, statusId, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, color, position, category } = body as Record<string, unknown>;

  try {
    const updated = await updateStatus(statusId, {
      ...(typeof name === "string" && { name }),
      ...(typeof color === "string" && { color }),
      ...(typeof position === "number" && { position }),
      ...(isValidCategory(category) && { category }),
    });
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
  const { id: projectId, statusId } = await params;

  const { allowed } = await assertAdminAndStatus(projectId, statusId, session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    await deleteStatus(statusId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
