import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    project: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { createProject, getProjects } from "@/lib/services/projects.service";

const mockFindUnique = vi.mocked(db.project.findUnique);
const mockCreate = vi.mocked(db.project.create);
const mockFindMany = vi.mocked(db.project.findMany);

beforeEach(() => vi.clearAllMocks());

describe("createProject", () => {
  it("creates a project with default statuses", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "proj1",
      name: "My Project",
      slug: "my-project",
      createdAt: new Date(),
      statuses: [],
    } as never);

    const result = await createProject({ name: "My Project", slug: "my-project" });
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(result.slug).toBe("my-project");
  });

  it("normalises slug to lowercase", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "proj1", name: "Test", slug: "test", createdAt: new Date(), statuses: [],
    } as never);

    await createProject({ name: "Test", slug: "TEST" });
    const call = mockCreate.mock.calls[0][0] as { data: { slug: string } };
    expect(call.data.slug).toBe("test");
  });

  it("rejects project name shorter than 2 characters", async () => {
    await expect(createProject({ name: "A", slug: "a" })).rejects.toThrow(
      "Project name must be at least 2 characters."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects invalid slug characters", async () => {
    await expect(
      createProject({ name: "Test", slug: "my project!" })
    ).rejects.toThrow("Slug must be 2–20 lowercase letters");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects slug longer than 20 characters", async () => {
    await expect(
      createProject({ name: "Test", slug: "this-slug-is-way-too-long" })
    ).rejects.toThrow("Slug must be 2–20 lowercase letters");
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("rejects duplicate slug with clear error", async () => {
    mockFindUnique.mockResolvedValue({ id: "existing" } as never);
    await expect(
      createProject({ name: "Test", slug: "my-project" })
    ).rejects.toThrow("A project with this slug already exists.");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("getProjects", () => {
  it("returns list of projects ordered by creation date", async () => {
    const projects = [
      { id: "p1", name: "Alpha", slug: "alpha", createdAt: new Date(), statuses: [] },
      { id: "p2", name: "Beta", slug: "beta", createdAt: new Date(), statuses: [] },
    ];
    mockFindMany.mockResolvedValue(projects as never);

    const result = await getProjects();
    expect(result).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledOnce();
  });
});
