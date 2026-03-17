"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode, type WorkflowNodeData } from "./workflow-node";
import { WorkflowToolbar } from "./workflow-toolbar";
import { type StatusCategory } from "@/lib/status-category";
import { Button } from "@/components/ui/button";
import { STATUS_CATEGORIES } from "@/lib/status-category";

const nodeTypes = { workflowState: WorkflowNode };

type DbState = {
  id: string;
  name: string;
  color: string;
  positionX: number;
  positionY: number;
  position: number;
  category: StatusCategory;
};

type DbTransition = {
  id: string;
  fromStateId: string;
  toStateId: string;
  sourceHandle: string | null;
  targetHandle: string | null;
};

type WorkflowCanvasProps = {
  workflowId: string;
  initialStates: DbState[];
  initialTransitions: DbTransition[];
  canEdit: boolean;
};

type EditingNode = {
  id: string;
  name: string;
  color: string;
  category: StatusCategory;
};

function dbStateToNode(s: DbState): Node<WorkflowNodeData> {
  return {
    id: s.id,
    type: "workflowState",
    position: { x: s.positionX, y: s.positionY },
    data: { name: s.name, color: s.color, category: s.category },
  };
}

function dbTransitionToEdge(t: DbTransition): Edge {
  return {
    id: t.id,
    source: t.fromStateId,
    target: t.toStateId,
    sourceHandle: t.sourceHandle ?? undefined,
    targetHandle: t.targetHandle ?? undefined,
    markerEnd: { type: MarkerType.ArrowClosed },
    deletable: true,
  };
}

export function WorkflowCanvas({
  workflowId,
  initialStates,
  initialTransitions,
  canEdit,
}: WorkflowCanvasProps) {
  const tempIdCounterRef = useRef(0);
  function nextTempId() {
    return `new-${++tempIdCounterRef.current}`;
  }

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<WorkflowNodeData>>(
    initialStates.map(dbStateToNode)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialTransitions.map(dbTransitionToEdge)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<EditingNode | null>(null);
  // Prevents ReactFlow's post-save internal change events from re-setting dirty
  const skipDirtyRef = useRef(false);

  // Warn on unsaved changes before navigating away
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Only mark dirty for changes that represent real user edits.
  // "select" and "dimensions" are internal ReactFlow events (e.g. during fitView).
  const handleNodesChange = useCallback(
    (changes: NodeChange<Node<WorkflowNodeData>>[]) => {
      onNodesChange(changes);
      if (!skipDirtyRef.current && changes.some((c) => c.type !== "select" && c.type !== "dimensions")) {
        setIsDirty(true);
      }
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (!skipDirtyRef.current && changes.some((c) => c.type !== "select")) {
        setIsDirty(true);
      }
    },
    [onEdgesChange]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit) return;
      setEdges((eds) =>
        addEdge(
          { ...connection, markerEnd: { type: MarkerType.ArrowClosed }, deletable: true },
          eds
        )
      );
      setIsDirty(true);
    },
    [canEdit, setEdges]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!canEdit) return;
      const data = node.data as WorkflowNodeData;
      setEditingNode({ id: node.id, name: data.name, color: data.color, category: data.category });
    },
    [canEdit]
  );

  function handleAddState(name: string, color: string, category: StatusCategory) {
    const tempId = nextTempId();
    setNodes((nds) => [
      ...nds,
      {
        id: tempId,
        type: "workflowState",
        position: { x: 150 + Math.random() * 200, y: 150 + Math.random() * 150 },
        data: { name, color, category },
      },
    ]);
    setIsDirty(true);
  }

  function handleSaveEdit(name: string, color: string, category: StatusCategory) {
    if (!editingNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode.id ? { ...n, data: { ...n.data, name, color, category } } : n
      )
    );
    setIsDirty(true);
    setEditingNode(null);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const states = nodes.map((n, idx) => ({
        id: n.id,
        name: (n.data as WorkflowNodeData).name,
        color: (n.data as WorkflowNodeData).color,
        category: (n.data as WorkflowNodeData).category,
        positionX: n.position.x,
        positionY: n.position.y,
        position: idx,
      }));

      const transitions = edges.map((e) => ({
        fromStateId: e.source,
        toStateId: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      }));

      const res = await fetch(`/api/v1/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ states, transitions }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed.");
      }

      const updated = await res.json();
      // Suppress dirty-marking for the frames ReactFlow needs to settle after reset
      skipDirtyRef.current = true;
      setNodes((updated.states as DbState[]).map(dbStateToNode));
      setEdges((updated.transitions as DbTransition[]).map(dbTransitionToEdge));
      setIsDirty(false);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        skipDirtyRef.current = false;
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={canEdit ? handleNodesChange : undefined}
        onEdgesChange={canEdit ? handleEdgesChange : undefined}
        onConnect={canEdit ? onConnect : undefined}
        onNodeDoubleClick={canEdit ? handleNodeDoubleClick : undefined}
        nodesDraggable={canEdit}
        nodesConnectable={canEdit}
        edgesReconnectable={canEdit}
        fitView
        connectionMode={ConnectionMode.Loose}
        colorMode="system"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>

      <WorkflowToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        canEdit={canEdit}
        onAddState={handleAddState}
        onSave={handleSave}
      />

      {editingNode && (
        <EditNodeModal
          initial={editingNode}
          onSave={handleSaveEdit}
          onClose={() => setEditingNode(null)}
        />
      )}

      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-sm px-4 py-2 rounded shadow">
          {error}
        </div>
      )}
    </div>
  );
}

function EditNodeModal({
  initial,
  onSave,
  onClose,
}: {
  initial: EditingNode;
  onSave: (name: string, color: string, category: StatusCategory) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [color, setColor] = useState(initial.color);
  const [category, setCategory] = useState<StatusCategory>(initial.category);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, color, category);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg border shadow-lg p-6 w-80 space-y-4">
        <h3 className="font-semibold text-sm">Edit State</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as StatusCategory)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {STATUS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
