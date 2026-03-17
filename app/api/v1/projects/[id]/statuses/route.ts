import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership, createStatus } from "@/lib/services/projects.service";
import { canManageMembers, canEditIssue } from "@/lib/permissions";
import { isValidCategory } from "@/lib/status-category";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId } = await params;

  const [membership, flags] = await Promise.all([
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canEditIssue(membership?.role ?? null, flags?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const statuses = await db.status.findMany({
    where: { projectId },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(statuses);
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { id: projectId } = await params;

  const [membership, flags] = await Promise.all([
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canManageMembers(membership?.role ?? null, flags?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { name, color, category } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Status name is required." }, { status: 422 });
  }
  if (category !== undefined && !isValidCategory(category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 422 });
  }

  try {
    const status = await createStatus(projectId, {
      name,
      color: typeof color === "string" ? color : undefined,
      category: isValidCategory(category) ? category : undefined,
    });
    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
