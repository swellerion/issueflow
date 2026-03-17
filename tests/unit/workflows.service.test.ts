import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    workflow: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    workflowState: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    workflowTransition: {
      createMany: vi.fn(),
    },
    project: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflowCanvas,
  deleteWorkflow,
} from "@/lib/services/workflows.service";

const mockWorkflowCreate = vi.mocked(db.workflow.create);
const mockWorkflowFindMany = vi.mocked(db.workflow.findMany);
const mockWorkflowFindUnique = vi.mocked(db.workflow.findUnique);
const mockWorkflowUpdate = vi.mocked(db.workflow.update);
const mockWorkflowDelete = vi.mocked(db.workflow.delete);
const mockProjectCount = vi.mocked(db.project.count);
const mockTransaction = vi.mocked(db.$transaction);

beforeEach(() => vi.clearAllMocks());

describe("createWorkflow", () => {
  it("creates a workflow with trimmed name", async () => {
    mockWorkflowCreate.mockResolvedValue({ id: "wf1", name: "SDLC" } as never);
    await createWorkflow({ name: "  SDLC  ", createdById: "user1" });
    expect(mockWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "SDLC" }) })
    );
  });

  it("rejects empty name", async () => {
    await expect(createWorkflow({ name: "   ", createdById: "user1" })).rejects.toThrow(
      "Workflow name is required."
    );
    expect(mockWorkflowCreate).not.toHaveBeenCalled();
  });

  it("stores optional description", async () => {
    mockWorkflowCreate.mockResolvedValue({ id: "wf1", name: "W" } as never);
    await createWorkflow({ name: "W", description: "  desc  ", createdById: "u1" });
    expect(mockWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: "desc" }),
      })
    );
  });

  it("stores null when description is empty string", async () => {
    mockWorkflowCreate.mockResolvedValue({ id: "wf1", name: "W" } as never);
    await createWorkflow({ name: "W", description: "   ", createdById: "u1" });
    expect(mockWorkflowCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ description: null }),
      })
    );
  });
});

describe("getWorkflows", () => {
  it("returns all workflows ordered by createdAt", async () => {
    mockWorkflowFindMany.mockResolvedValue([{ id: "wf1", name: "W" }] as never);
    const result = await getWorkflows();
    expect(result).toHaveLength(1);
    expect(mockWorkflowFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } })
    );
  });
});

describe("getWorkflowById", () => {
  it("returns workflow with states and transitions", async () => {
    mockWorkflowFindUnique.mockResolvedValue({
      id: "wf1",
      states: [],
      transitions: [],
    } as never);
    const result = await getWorkflowById("wf1");
    expect(result?.id).toBe("wf1");
  });

  it("returns null for unknown id", async () => {
    mockWorkflowFindUnique.mockResolvedValue(null);
    const result = await getWorkflowById("missing");
    expect(result).toBeNull();
  });
});

describe("updateWorkflowCanvas", () => {
  const baseState = (id: string, name: string) => ({
    id, name, color: "#fff", positionX: 0, positionY: 0, position: 0, category: "TODO" as const,
  });

  it("rejects when a transition references an unknown fromStateId", async () => {
    await expect(
      updateWorkflowCanvas("wf1", [baseState("s1", "A")], [{ fromStateId: "s1", toStateId: "unknown" }])
    ).rejects.toThrow('Transition toStateId "unknown" not found in states.');
  });

  it("rejects when a transition references an unknown toStateId", async () => {
    await expect(
      updateWorkflowCanvas("wf1", [baseState("s1", "A")], [{ fromStateId: "unknown", toStateId: "s1" }])
    ).rejects.toThrow('Transition fromStateId "unknown" not found in states.');
  });

  it("calls transaction and re-inserts states+transitions", async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        workflowState: {
          deleteMany: vi.fn().mockResolvedValue(undefined),
          create: vi.fn()
            .mockResolvedValueOnce({ id: "db-s1" })
            .mockResolvedValueOnce({ id: "db-s2" }),
        },
        workflowTransition: { createMany: vi.fn().mockResolvedValue(undefined) },
        workflow: { update: vi.fn().mockResolvedValue({ id: "wf1", states: [], transitions: [] }) },
      };
      return fn(tx as never);
    });

    await updateWorkflowCanvas(
      "wf1",
      [
        { id: "tmp-1", name: "Todo", color: "#aaa", positionX: 0, positionY: 0, position: 0, category: "TODO" as const },
        { id: "tmp-2", name: "Done", color: "#bbb", positionX: 100, positionY: 0, position: 1, category: "DONE" as const },
      ],
      [{ fromStateId: "tmp-1", toStateId: "tmp-2" }]
    );

    expect(mockTransaction).toHaveBeenCalledOnce();
  });
});

describe("deleteWorkflow", () => {
  it("deletes when no projects are using the workflow", async () => {
    mockProjectCount.mockResolvedValue(0);
    mockWorkflowDelete.mockResolvedValue({ id: "wf1" } as never);
    await deleteWorkflow("wf1");
    expect(mockWorkflowDelete).toHaveBeenCalledWith({ where: { id: "wf1" } });
  });

  it("throws when workflow is in use by a project", async () => {
    mockProjectCount.mockResolvedValue(1);
    await expect(deleteWorkflow("wf1")).rejects.toThrow(
      "Cannot delete a workflow that is currently adopted by one or more projects."
    );
    expect(mockWorkflowDelete).not.toHaveBeenCalled();
  });
});
