import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMembership, getMembers, addMember } from "@/lib/services/projects.service";
import { getUserByUsername } from "@/lib/services/users.service";
import { canManageMembers } from "@/lib/permissions";
import { getUserFlags } from "@/lib/services/users.service";
import { ProjectRole } from "@/app/generated/prisma/enums";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await params;

  const [membership, currentUser] = await Promise.all([
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);

  // Any member or super-admin can view
  if (!membership && !currentUser?.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const members = await getMembers(projectId);
  return NextResponse.json(members);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId } = await params;

  const [membership, currentUser] = await Promise.all([
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);

  if (!canManageMembers(membership?.role ?? null, currentUser?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { username, role } = body as Record<string, unknown>;

  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "username is required." }, { status: 400 });
  }

  const validRoles: string[] = [ProjectRole.ADMIN, ProjectRole.MEMBER, ProjectRole.VIEWER];
  if (typeof role !== "string" || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const targetUser = await getUserByUsername(username.trim());
  if (!targetUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const existingMembership = await getMembership(projectId, targetUser.id);
  if (existingMembership) {
    return NextResponse.json({ error: "User is already a member." }, { status: 409 });
  }

  const newMembership = await addMember(projectId, targetUser.id, role as ProjectRole);
  return NextResponse.json(newMembership, { status: 201 });
}
