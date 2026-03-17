import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    statusTransition: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    workflow: {
      findUnique: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    status: {
      aggregate: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    issue: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import { isTransitionAllowed } from "@/lib/services/issues.service";
import {
  adoptWorkflow,
  detachWorkflow,
  createStatus,
  deleteStatus,
} from "@/lib/services/projects.service";

const mockFindUnique = vi.mocked(db.statusTransition.findUnique);
const mockTransaction = vi.mocked(db.$transaction);
const mockStatusAggregate = vi.mocked(db.status.aggregate);
const mockStatusCreate = vi.mocked(db.status.create);
const mockStatusDelete = vi.mocked(db.status.delete);
const mockIssueCount = vi.mocked(db.issue.count);

beforeEach(() => vi.clearAllMocks());

describe("isTransitionAllowed", () => {
  it("returns true when workflowId is null (no workflow adopted)", async () => {
    const result = await isTransitionAllowed("proj1", null, "s1", "s2");
    expect(result).toBe(true);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns true when a matching StatusTransition exists", async () => {
    mockFindUnique.mockResolvedValue({ id: "st1" } as never);
    const result = await isTransitionAllowed("proj1", "wf1", "s1", "s2");
    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId_fromStatusId_toStatusId: {
            projectId: "proj1",
            fromStatusId: "s1",
            toStatusId: "s2",
          },
        },
      })
    );
  });

  it("returns false when no matching StatusTransition exists", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await isTransitionAllowed("proj1", "wf1", "s1", "s3");
    expect(result).toBe(false);
  });

  it("returns true when moving to the same status (no-op)", async () => {
    // API layer handles this, but service itself is called — no workflow check needed
    const result = await isTransitionAllowed("proj1", null, "s1", "s1");
    expect(result).toBe(true);
  });
});

describe("detachWorkflow", () => {
  it("deletes status transitions and nullifies workflowId", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        statusTransition: { deleteMany: vi.fn().mockResolvedValue(undefined) },
        project: { update: vi.fn().mockResolvedValue(undefined) },
      };
      const result = await fn(tx as never);
      expect(tx.statusTransition.deleteMany).toHaveBeenCalledWith({
        where: { projectId: "proj1" },
      });
      expect(tx.project.update).toHaveBeenCalledWith({
        where: { id: "proj1" },
        data: { workflowId: null },
      });
      return result;
    });

    await detachWorkflow("proj1");
    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});

describe("adoptWorkflow", () => {
  it("throws when workflow not found", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        workflow: { findUnique: vi.fn().mockResolvedValue(null) },
        project: { findUnique: vi.fn().mockResolvedValue({ id: "p1", statuses: [] }) },
      };
      return fn(tx as never);
    });
    await expect(adoptWorkflow("proj1", "wf1")).rejects.toThrow("Workflow not found.");
  });

  it("throws when project not found", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        workflow: {
          findUnique: vi.fn().mockResolvedValue({
            id: "wf1",
            states: [],
            transitions: [],
          }),
        },
        project: { findUnique: vi.fn().mockResolvedValue(null) },
      };
      return fn(tx as never);
    });
    await expect(adoptWorkflow("proj1", "wf1")).rejects.toThrow("Project not found.");
  });

  it("returns list of unmatched state names", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        workflow: {
          findUnique: vi.fn().mockResolvedValue({
            id: "wf1",
            states: [
              { id: "ws1", name: "Todo" },
              { id: "ws2", name: "In Progress" },
              { id: "ws3", name: "Done" },
            ],
            transitions: [],
          }),
        },
        project: {
          findUnique: vi.fn().mockResolvedValue({
            id: "proj1",
            statuses: [
              { id: "s1", name: "Todo" },
              { id: "s2", name: "Done" },
              // "In Progress" is missing
            ],
          }),
          update: vi.fn().mockResolvedValue(undefined),
        },
        statusTransition: {
          deleteMany: vi.fn().mockResolvedValue(undefined),
          createMany: vi.fn().mockResolvedValue(undefined),
        },
      };
      return fn(tx as never);
    });

    const result = await adoptWorkflow("proj1", "wf1");
    expect(result.unmatched).toContain("In Progress");
    expect(result.unmatched).not.toContain("Todo");
    expect(result.unmatched).not.toContain("Done");
  });

  it("inserts matched StatusTransitions and sets workflowId", async () => {
    let capturedUpdate: unknown;
    let capturedCreateMany: unknown;

    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        workflow: {
          findUnique: vi.fn().mockResolvedValue({
            id: "wf1",
            states: [
              { id: "ws1", name: "Backlog" },
              { id: "ws2", name: "Done" },
            ],
            transitions: [{ id: "t1", fromStateId: "ws1", toStateId: "ws2" }],
          }),
        },
        project: {
          findUnique: vi.fn().mockResolvedValue({
            id: "proj1",
            statuses: [
              { id: "s1", name: "Backlog" },
              { id: "s2", name: "Done" },
            ],
          }),
          update: vi.fn().mockImplementation((args: unknown) => {
            capturedUpdate = args;
            return undefined;
          }),
        },
        statusTransition: {
          deleteMany: vi.fn().mockResolvedValue(undefined),
          createMany: vi.fn().mockImplementation((args: unknown) => {
            capturedCreateMany = args;
            return undefined;
          }),
        },
      };
      return fn(tx as never);
    });

    await adoptWorkflow("proj1", "wf1");

    const updateCall = capturedUpdate as { data: { workflowId: string } };
    expect(updateCall.data.workflowId).toBe("wf1");

    const createManyCall = capturedCreateMany as {
      data: Array<{ fromStatusId: string; toStatusId: string }>;
    };
    expect(createManyCall.data).toHaveLength(1);
    expect(createManyCall.data[0]).toMatchObject({
      fromStatusId: "s1",
      toStatusId: "s2",
    });
  });
});

describe("createStatus", () => {
  it("appends at max position + 1", async () => {
    mockStatusAggregate.mockResolvedValue({ _max: { position: 3 } } as never);
    mockStatusCreate.mockResolvedValue({
      id: "s5",
      name: "Review",
      color: "#6366f1",
      position: 4,
      projectId: "proj1",
    } as never);

    await createStatus("proj1", { name: "Review" });

    expect(mockStatusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 4 }),
      })
    );
  });

  it("starts at position 0 when no statuses exist", async () => {
    mockStatusAggregate.mockResolvedValue({ _max: { position: null } } as never);
    mockStatusCreate.mockResolvedValue({ id: "s1", position: 0 } as never);

    await createStatus("proj1", { name: "First" });

    expect(mockStatusCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ position: 0 }),
      })
    );
  });

  it("rejects empty name", async () => {
    await expect(createStatus("proj1", { name: "  " })).rejects.toThrow(
      "Status name is required."
    );
    expect(mockStatusCreate).not.toHaveBeenCalled();
  });
});

describe("deleteStatus", () => {
  it("deletes when no issues are assigned", async () => {
    mockIssueCount.mockResolvedValue(0);
    mockStatusDelete.mockResolvedValue({ id: "s1" } as never);
    await deleteStatus("s1");
    expect(mockStatusDelete).toHaveBeenCalledWith({ where: { id: "s1" } });
  });

  it("throws when issues are assigned to the status", async () => {
    mockIssueCount.mockResolvedValue(3);
    await expect(deleteStatus("s1")).rejects.toThrow(
      "Cannot delete a status that has issues assigned to it."
    );
    expect(mockStatusDelete).not.toHaveBeenCalled();
  });
});
