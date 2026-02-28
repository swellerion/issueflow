import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    issue: {
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { createIssue, updateIssue } from "@/lib/services/issues.service";

const mockTransaction = vi.mocked(db.$transaction);

beforeEach(() => vi.clearAllMocks());

describe("createIssue", () => {
  function setupTransaction(issueTypeId?: string) {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: { findUnique: vi.fn().mockResolvedValue({ slug: "isf" }) },
        issue: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockResolvedValue({
            id: "issue1",
            identifier: "ISF-1",
            title: "Test issue",
            description: null,
            statusId: "status1",
            issueTypeId: issueTypeId ?? null,
            projectId: "proj1",
            authorId: "user1",
            assigneeId: null,
            position: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            status: { id: "status1", name: "Backlog", color: "#94a3b8", position: 0 },
            issueType: issueTypeId ? { id: issueTypeId, name: "Task", icon: "check-square-2", color: "#6366f1" } : null,
            author: { id: "user1", username: "alice" },
            assignee: null,
          }),
        },
      };
      return fn(tx as never);
    });
  }

  it("creates an issue with a server-generated identifier", async () => {
    setupTransaction();

    const result = await createIssue({
      title: "Test issue",
      statusId: "status1",
      projectId: "proj1",
      authorId: "user1",
    });

    expect(result.identifier).toBe("ISF-1");
  });

  it("generates identifier using project slug in uppercase", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: { findUnique: vi.fn().mockResolvedValue({ slug: "myapp" }) },
        issue: {
          count: vi.fn().mockResolvedValue(4),
          create: vi.fn().mockResolvedValue({ identifier: "MYAPP-5" }),
        },
      };
      return fn(tx as never);
    });

    const result = await createIssue({
      title: "Fifth issue",
      statusId: "s1",
      projectId: "p1",
      authorId: "u1",
    });

    expect(result.identifier).toBe("MYAPP-5");
  });

  it("rejects empty title", async () => {
    await expect(
      createIssue({ title: "  ", statusId: "s1", projectId: "p1", authorId: "u1" })
    ).rejects.toThrow("Issue title is required.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects title exceeding 255 characters", async () => {
    await expect(
      createIssue({
        title: "a".repeat(256),
        statusId: "s1",
        projectId: "p1",
        authorId: "u1",
      })
    ).rejects.toThrow("Issue title must be 255 characters or fewer.");
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("passes issueTypeId through to tx.issue.create", async () => {
    setupTransaction("type1");
    let capturedCreate: unknown;
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        project: { findUnique: vi.fn().mockResolvedValue({ slug: "isf" }) },
        issue: {
          count: vi.fn().mockResolvedValue(0),
          create: vi.fn().mockImplementation((args: unknown) => {
            capturedCreate = args;
            return { id: "issue1", identifier: "ISF-1", issueTypeId: "type1" };
          }),
        },
      };
      return fn(tx as never);
    });

    await createIssue({
      title: "Typed issue",
      statusId: "status1",
      issueTypeId: "type1",
      projectId: "proj1",
      authorId: "user1",
    });

    const call = capturedCreate as { data: { issueTypeId: string } };
    expect(call.data.issueTypeId).toBe("type1");
  });
});

describe("updateIssue", () => {
  const mockUpdate = vi.mocked(db.issue.update);

  it("spreads issueTypeId when provided", async () => {
    mockUpdate.mockResolvedValue({
      id: "issue1",
      issueTypeId: "type1",
    } as never);

    await updateIssue("issue1", { issueTypeId: "type1" });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ issueTypeId: "type1" }),
      })
    );
  });

  it("does not include issueTypeId when not provided", async () => {
    mockUpdate.mockResolvedValue({ id: "issue1" } as never);

    await updateIssue("issue1", { statusId: "status1" });

    const call = mockUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect("issueTypeId" in call.data).toBe(false);
  });
});
