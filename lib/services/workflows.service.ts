import { db } from "@/lib/db";
import { type StatusCategory } from "@/app/generated/prisma/enums";

export type CreateWorkflowInput = {
  name: string;
  description?: string;
  createdById: string;
};

export type WorkflowStateInput = {
  id?: string; // existing id for reference; if absent, treated as new
  name: string;
  color: string;
  positionX: number;
  positionY: number;
  position: number;
};

export type WorkflowTransitionInput = {
  fromStateTempId: string; // index or temp id referencing a state in the same save payload
  toStateTempId: string;
};

export type CanvasStateInput = {
  id: string; // temporary id used to link transitions in the same payload
  name: string;
  color: string;
  positionX: number;
  positionY: number;
  position: number;
  category: StatusCategory;
};

export type CanvasTransitionInput = {
  fromStateId: string; // temp id from CanvasStateInput
  toStateId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export async function createWorkflow(input: CreateWorkflowInput) {
  const name = input.name.trim();
  if (name.length < 1) throw new Error("Workflow name is required.");
  return db.workflow.create({
    data: {
      name,
      description: input.description?.trim() || null,
      createdById: input.createdById,
    },
  });
}

export async function getWorkflows() {
  return db.workflow.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { projects: true } },
      createdBy: { select: { id: true, username: true } },
    },
  });
}

export async function getWorkflowById(id: string) {
  return db.workflow.findUnique({
    where: { id },
    include: {
      states: { orderBy: { position: "asc" } },
      transitions: true,
      createdBy: { select: { id: true, username: true } },
    },
  });
}

/**
 * Atomically replace all states + transitions for a workflow.
 * `states` have temporary client-side IDs used only within this call to wire transitions.
 */
export async function updateWorkflowCanvas(
  id: string,
  states: CanvasStateInput[],
  transitions: CanvasTransitionInput[]
) {
  // Validate all transition endpoints reference a state in the payload
  const tempIds = new Set(states.map((s) => s.id));
  for (const t of transitions) {
    if (!tempIds.has(t.fromStateId)) {
      throw new Error(`Transition fromStateId "${t.fromStateId}" not found in states.`);
    }
    if (!tempIds.has(t.toStateId)) {
      throw new Error(`Transition toStateId "${t.toStateId}" not found in states.`);
    }
  }

  return db.$transaction(async (tx) => {
    // Delete existing states (cascades to transitions)
    await tx.workflowState.deleteMany({ where: { workflowId: id } });

    // Re-insert states; capture mapping: tempId → real DB id
    const tempToReal = new Map<string, string>();
    for (const s of states) {
      const created = await tx.workflowState.create({
        data: {
          workflowId: id,
          name: s.name,
          color: s.color,
          positionX: s.positionX,
          positionY: s.positionY,
          position: s.position,
          category: s.category,
        },
      });
      tempToReal.set(s.id, created.id);
    }

    // Insert transitions using real IDs
    if (transitions.length > 0) {
      await tx.workflowTransition.createMany({
        data: transitions.map((t) => ({
          workflowId: id,
          fromStateId: tempToReal.get(t.fromStateId)!,
          toStateId: tempToReal.get(t.toStateId)!,
          sourceHandle: t.sourceHandle ?? null,
          targetHandle: t.targetHandle ?? null,
        })),
        skipDuplicates: true,
      });
    }

    // Update updatedAt
    return tx.workflow.update({
      where: { id },
      data: { updatedAt: new Date() },
      include: {
        states: { orderBy: { position: "asc" } },
        transitions: true,
      },
    });
  });
}

export async function deleteWorkflow(id: string) {
  const inUse = await db.project.count({ where: { workflowId: id } });
  if (inUse > 0) {
    throw new Error("Cannot delete a workflow that is currently adopted by one or more projects.");
  }
  return db.workflow.delete({ where: { id } });
}
