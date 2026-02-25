"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Column } from "@/components/board/column";
import { IssueCard } from "@/components/board/issue-card";

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
};

type Issue = {
  id: string;
  identifier: string;
  title: string;
  statusId: string;
  assignee: { id: string; username: string } | null;
};

type BoardProps = {
  statuses: Status[];
  issues: Issue[];
};

export function Board({ statuses, issues: initialIssues }: BoardProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);

  // Require 8px movement before drag starts — prevents accidental drags on clicks
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const issue = issues.find((i) => i.id === active.id);
      if (issue) setActiveIssue(issue);
    },
    [issues]
  );

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveIssue(null);

      if (!over || active.id === over.id) return;

      const newStatusId = over.id as string;
      const issue = issues.find((i) => i.id === active.id);
      if (!issue || issue.statusId === newStatusId) return;

      const previousIssues = issues;

      // Optimistic update
      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, statusId: newStatusId } : i))
      );

      try {
        const res = await fetch(`/api/v1/issues/${issue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId: newStatusId }),
        });

        if (!res.ok) {
          throw new Error("Failed to update issue status.");
        }
      } catch (error) {
        console.error("[Board] drag-and-drop update failed:", error);
        // Revert on failure
        setIssues(previousIssues);
      }
    },
    [issues]
  );

  const issuesByStatus = statuses.reduce<Record<string, Issue[]>>((acc, status) => {
    acc[status.id] = issues.filter((issue) => issue.statusId === status.id);
    return acc;
  }, {});

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map((status) => (
          <Column
            key={status.id}
            id={status.id}
            name={status.name}
            color={status.color}
            issues={issuesByStatus[status.id] ?? []}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeIssue && (
          <IssueCard {...activeIssue} overlay />
        )}
      </DragOverlay>
    </DndContext>
  );
}
