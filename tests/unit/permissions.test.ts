import { describe, it, expect } from "vitest";
import { canEditIssue, canManageMembers, canPromoteToSuperAdmin } from "@/lib/permissions";
import { ProjectRole } from "@/app/generated/prisma/enums";

describe("canEditIssue", () => {
  it("allows ADMIN", () => expect(canEditIssue(ProjectRole.ADMIN, false)).toBe(true));
  it("allows MEMBER", () => expect(canEditIssue(ProjectRole.MEMBER, false)).toBe(true));
  it("denies VIEWER", () => expect(canEditIssue(ProjectRole.VIEWER, false)).toBe(false));
  it("denies null role", () => expect(canEditIssue(null, false)).toBe(false));
  it("allows SuperAdmin with null role", () => expect(canEditIssue(null, true)).toBe(true));
  it("allows SuperAdmin with VIEWER role", () => expect(canEditIssue(ProjectRole.VIEWER, true)).toBe(true));
});

describe("canManageMembers", () => {
  it("allows ADMIN", () => expect(canManageMembers(ProjectRole.ADMIN, false)).toBe(true));
  it("denies MEMBER", () => expect(canManageMembers(ProjectRole.MEMBER, false)).toBe(false));
  it("denies VIEWER", () => expect(canManageMembers(ProjectRole.VIEWER, false)).toBe(false));
  it("denies null role", () => expect(canManageMembers(null, false)).toBe(false));
  it("allows SuperAdmin with null role", () => expect(canManageMembers(null, true)).toBe(true));
  it("allows SuperAdmin with VIEWER role", () => expect(canManageMembers(ProjectRole.VIEWER, true)).toBe(true));
});

describe("canPromoteToSuperAdmin", () => {
  it("allows ADMIN", () => expect(canPromoteToSuperAdmin(ProjectRole.ADMIN, false)).toBe(true));
  it("denies MEMBER", () => expect(canPromoteToSuperAdmin(ProjectRole.MEMBER, false)).toBe(false));
  it("denies VIEWER", () => expect(canPromoteToSuperAdmin(ProjectRole.VIEWER, false)).toBe(false));
  it("denies null role", () => expect(canPromoteToSuperAdmin(null, false)).toBe(false));
  it("allows SuperAdmin with null role", () => expect(canPromoteToSuperAdmin(null, true)).toBe(true));
  it("allows SuperAdmin with VIEWER role", () => expect(canPromoteToSuperAdmin(ProjectRole.VIEWER, true)).toBe(true));
});
