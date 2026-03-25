import { ProjectRole } from "@/app/generated/prisma/enums";

export type MembershipRole = ProjectRole | null;

export function canEditIssue(role: MembershipRole, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return role === ProjectRole.ADMIN || role === ProjectRole.MEMBER;
}

export function canManageMembers(role: MembershipRole, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return role === ProjectRole.ADMIN;
}

export function canPromoteToSuperAdmin(role: MembershipRole, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  return role === ProjectRole.ADMIN;
}

export function canDeleteComment(
  commentAuthorId: string,
  requestingUserId: string,
  role: MembershipRole,
  isSuperAdmin: boolean
): boolean {
  if (requestingUserId === commentAuthorId) return true;
  if (isSuperAdmin) return true;
  return role === ProjectRole.ADMIN;
}
