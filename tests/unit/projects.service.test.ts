import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    projectMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  createProject,
  getProjects,
  getMembership,
  getMembers,
  addMember,
  updateMemberRole,
  removeMember,
  promoteToSuperAdmin,
} from "@/lib/services/projects.service";
import { ProjectRole } from "@/app/generated/prisma/enums";

const mockTransaction = vi.mocked(db.$transaction);
const mockFindUnique = vi.mocked(db.project.findUnique);
const mockCreate = vi.mocked(db.project.create);
const mockFindMany = vi.mocked(db.project.findMany);
const mockMembershipFindUnique = vi.mocked(db.projectMembership.findUnique);
const mockMembershipFindMany = vi.mocked(db.projectMembership.findMany);
const mockMembershipCreate = vi.mocked(db.projectMembership.create);
const mockMembershipUpdate = vi.mocked(db.projectMembership.update);
const mockMembershipDelete = vi.mocked(db.projectMembership.delete);
const mockMembershipCount = vi.mocked(db.projectMembership.count);
const mockUserUpdate = vi.mocked(db.user.update);

beforeEach(() => vi.clearAllMocks());

describe("createProject", () => {
  it("creates a project with default statuses inside a transaction", async () => {
    const projectResult = {
      id: "proj1",
      name: "My Project",
      slug: "my-project",
      createdAt: new Date(),
      ownerId: "user1",
      statuses: [],
      issueTypes: [],
    };
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue(projectResult) },
        projectMembership: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx as never);
    });

    const result = await createProject({ name: "My Project", slug: "my-project", userId: "user1" });
    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(result.slug).toBe("my-project");
  });

  it("normalises slug to lowercase", async () => {
    const projectResult = {
      id: "proj1", name: "Test", slug: "test", createdAt: new Date(), ownerId: "user1", statuses: [], issueTypes: [],
    };
    let capturedCreate: unknown;
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((args: unknown) => { capturedCreate = args; return projectResult; }),
        },
        projectMembership: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx as never);
    });

    await createProject({ name: "Test", slug: "TEST", userId: "user1" });
    const call = capturedCreate as { data: { slug: string } };
    expect(call.data.slug).toBe("test");
  });

  it("seeds 4 default issue types alongside 4 default statuses", async () => {
    const projectResult = {
      id: "proj1", name: "My Project", slug: "my-project", createdAt: new Date(), ownerId: "user1",
      statuses: [], issueTypes: [],
    };
    let capturedCreate: unknown;
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((args: unknown) => { capturedCreate = args; return projectResult; }),
        },
        projectMembership: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx as never);
    });

    await createProject({ name: "My Project", slug: "my-project", userId: "user1" });
    const call = capturedCreate as { data: { statuses: { create: unknown[] }; issueTypes: { create: unknown[] } } };
    expect(call.data.statuses.create).toHaveLength(4);
    expect(call.data.issueTypes.create).toHaveLength(4);
    const typeNames = (call.data.issueTypes.create as Array<{ name: string }>).map((t) => t.name);
    expect(typeNames).toEqual(["Task", "Bug", "Feature", "Story"]);
  });

  it("rejects project name shorter than 2 characters", async () => {
    await expect(createProject({ name: "A", slug: "a", userId: "user1" })).rejects.toThrow(
      "Project name must be at least 2 characters."
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects invalid slug characters", async () => {
    await expect(
      createProject({ name: "Test", slug: "my project!", userId: "user1" })
    ).rejects.toThrow("Slug must be 2–20 lowercase letters");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects slug longer than 20 characters", async () => {
    await expect(
      createProject({ name: "Test", slug: "this-slug-is-way-too-long", userId: "user1" })
    ).rejects.toThrow("Slug must be 2–20 lowercase letters");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects duplicate slug with clear error", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: { findUnique: vi.fn().mockResolvedValue({ id: "existing" }), create: vi.fn() },
        projectMembership: { create: vi.fn() },
      };
      return fn(tx as never);
    });
    await expect(
      createProject({ name: "Test", slug: "my-project", userId: "user1" })
    ).rejects.toThrow("A project with this slug already exists.");
  });
});

describe("getProjects", () => {
  it("filters by membership when not super-admin", async () => {
    const projects = [
      { id: "p1", name: "Alpha", slug: "alpha", createdAt: new Date(), statuses: [] },
    ];
    mockFindMany.mockResolvedValue(projects as never);

    const result = await getProjects("user1");
    expect(result).toHaveLength(1);
    const call = mockFindMany.mock.calls[0][0] as { where: unknown };
    expect(call.where).toEqual({ memberships: { some: { userId: "user1" } } });
  });

  it("returns all projects for super-admin", async () => {
    const projects = [
      { id: "p1", name: "Alpha", slug: "alpha", createdAt: new Date(), statuses: [] },
      { id: "p2", name: "Beta", slug: "beta", createdAt: new Date(), statuses: [] },
    ];
    mockFindMany.mockResolvedValue(projects as never);

    const result = await getProjects("user1", true);
    expect(result).toHaveLength(2);
    const call = mockFindMany.mock.calls[0][0] as { where?: unknown };
    expect(call.where).toBeUndefined();
  });
});

describe("getMembership", () => {
  it("returns membership role for a user in a project", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.ADMIN } as never);
    const result = await getMembership("proj1", "user1");
    expect(result?.role).toBe(ProjectRole.ADMIN);
    expect(mockMembershipFindUnique).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: "proj1", userId: "user1" } },
      select: { role: true },
    });
  });

  it("returns null when user has no membership", async () => {
    mockMembershipFindUnique.mockResolvedValue(null);
    const result = await getMembership("proj1", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("getMembers", () => {
  it("returns members with user data", async () => {
    const members = [
      { id: "m1", projectId: "proj1", userId: "u1", role: ProjectRole.ADMIN, createdAt: new Date(), user: { id: "u1", username: "alice", isSuperAdmin: false } },
    ];
    mockMembershipFindMany.mockResolvedValue(members as never);
    const result = await getMembers("proj1");
    expect(result).toHaveLength(1);
    expect(result[0].user.username).toBe("alice");
  });
});

describe("addMember", () => {
  it("creates a new membership", async () => {
    mockMembershipCreate.mockResolvedValue({ id: "m1", projectId: "proj1", userId: "u2", role: ProjectRole.MEMBER, createdAt: new Date() } as never);
    const result = await addMember("proj1", "u2", ProjectRole.MEMBER);
    expect(mockMembershipCreate).toHaveBeenCalledWith({
      data: { projectId: "proj1", userId: "u2", role: ProjectRole.MEMBER },
    });
    expect(result.role).toBe(ProjectRole.MEMBER);
  });
});

describe("updateMemberRole", () => {
  it("updates a non-admin role without checking count", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.MEMBER } as never);
    mockMembershipUpdate.mockResolvedValue({ id: "m1", role: ProjectRole.VIEWER } as never);
    await updateMemberRole("proj1", "u1", ProjectRole.VIEWER);
    expect(mockMembershipUpdate).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: "proj1", userId: "u1" } },
      data: { role: ProjectRole.VIEWER },
    });
    expect(mockMembershipCount).not.toHaveBeenCalled();
  });

  it("allows downgrading an admin when other admins exist", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.ADMIN } as never);
    mockMembershipCount.mockResolvedValue(2 as never);
    mockMembershipUpdate.mockResolvedValue({ id: "m1", role: ProjectRole.MEMBER } as never);
    await updateMemberRole("proj1", "u1", ProjectRole.MEMBER);
    expect(mockMembershipUpdate).toHaveBeenCalled();
  });

  it("throws when downgrading the last admin", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.ADMIN } as never);
    mockMembershipCount.mockResolvedValue(1 as never);
    await expect(updateMemberRole("proj1", "u1", ProjectRole.MEMBER)).rejects.toThrow(
      "Cannot remove the last admin from a project."
    );
    expect(mockMembershipUpdate).not.toHaveBeenCalled();
  });

  it("skips count check when promoting to admin", async () => {
    mockMembershipUpdate.mockResolvedValue({ id: "m1", role: ProjectRole.ADMIN } as never);
    await updateMemberRole("proj1", "u1", ProjectRole.ADMIN);
    expect(mockMembershipFindUnique).not.toHaveBeenCalled();
    expect(mockMembershipCount).not.toHaveBeenCalled();
    expect(mockMembershipUpdate).toHaveBeenCalled();
  });
});

describe("removeMember", () => {
  it("deletes a non-admin membership without checking count", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.MEMBER } as never);
    mockMembershipDelete.mockResolvedValue({ id: "m1" } as never);
    await removeMember("proj1", "u1");
    expect(mockMembershipDelete).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: "proj1", userId: "u1" } },
    });
    expect(mockMembershipCount).not.toHaveBeenCalled();
  });

  it("allows removing an admin when other admins exist", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.ADMIN } as never);
    mockMembershipCount.mockResolvedValue(2 as never);
    mockMembershipDelete.mockResolvedValue({ id: "m1" } as never);
    await removeMember("proj1", "u1");
    expect(mockMembershipDelete).toHaveBeenCalled();
  });

  it("throws when removing the last admin", async () => {
    mockMembershipFindUnique.mockResolvedValue({ role: ProjectRole.ADMIN } as never);
    mockMembershipCount.mockResolvedValue(1 as never);
    await expect(removeMember("proj1", "u1")).rejects.toThrow(
      "Cannot remove the last admin from a project."
    );
    expect(mockMembershipDelete).not.toHaveBeenCalled();
  });
});

describe("promoteToSuperAdmin", () => {
  it("sets isSuperAdmin to true", async () => {
    mockUserUpdate.mockResolvedValue({ id: "u1", isSuperAdmin: true } as never);
    await promoteToSuperAdmin("u1");
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isSuperAdmin: true },
    });
  });
});
