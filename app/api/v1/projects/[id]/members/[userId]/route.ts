import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getMembership,
  getMembers,
  updateMemberRole,
  removeMember,
  promoteToSuperAdmin,
} from "@/lib/services/projects.service";
import { getUserFlags } from "@/lib/services/users.service";
import { canManageMembers, canPromoteToSuperAdmin } from "@/lib/permissions";
import { ProjectRole } from "@/app/generated/prisma/enums";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId, userId: targetUserId } = await params;

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

  const { role, isSuperAdmin } = body as Record<string, unknown>;

  if (isSuperAdmin === true) {
    if (!canPromoteToSuperAdmin(membership?.role ?? null, currentUser?.isSuperAdmin ?? false)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    await promoteToSuperAdmin(targetUserId);
    return NextResponse.json({ success: true });
  }

  const validRoles: string[] = [ProjectRole.ADMIN, ProjectRole.MEMBER, ProjectRole.VIEWER];
  if (typeof role !== "string" || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  await updateMemberRole(projectId, targetUserId, role as ProjectRole);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: projectId, userId: targetUserId } = await params;

  const [membership, currentUser] = await Promise.all([
    getMembership(projectId, session.user.id),
    getUserFlags(session.user.id),
  ]);

  if (!canManageMembers(membership?.role ?? null, currentUser?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Guard: prevent removing the last ADMIN
  const targetMembership = await getMembership(projectId, targetUserId);
  if (targetMembership?.role === ProjectRole.ADMIN) {
    const members = await getMembers(projectId);
    const adminCount = members.filter((m) => m.role === ProjectRole.ADMIN).length;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last project admin." },
        { status: 422 }
      );
    }
  }

  await removeMember(projectId, targetUserId);
  return NextResponse.json({ success: true });
}
