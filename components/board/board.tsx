"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { CategoryColumn } from "@/components/board/category-column";
import { IssueCard } from "@/components/board/issue-card";
import { IssuePanel, type PanelIssue } from "@/components/board/issue-panel";

import { type StatusCategory } from "@/lib/status-category";
import { isTransitionAllowed, type AllowedTransitions } from "@/lib/allowed-transitions";

const CATEGORY_ORDER = ["TODO", "IN_PROGRESS", "DONE"] as const;

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
  category: StatusCategory;
};

type Issue = {
  id: string;
  identifier: string;
  title: string;
  statusId: string;
  issueType?: { name: string; icon: string; color: string } | null;
  assignee: { id: string; username: string } | null;
  linksTo: { id: string }[];
};

type User = { id: string; username: string };

type BoardProps = {
  statuses: Status[];
  issues: Issue[];
  canEdit: boolean;
  selectedIssue: PanelIssue | null;
  users: User[];
  slug: string;
  allowedTransitions: AllowedTransitions;
};

export function Board({
  statuses,
  issues: initialIssues,
  canEdit,
  selectedIssue,
  users,
  slug,
  allowedTransitions,
}: BoardProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  // Keep board cards in sync when the panel edits an issue (router.refresh())
  useEffect(() => {
    if (!activeIssue) {
      setIssues(initialIssues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIssues]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const checkTransition = useCallback(
    (fromStatusId: string, toStatusId: string): boolean =>
      isTransitionAllowed(allowedTransitions, fromStatusId, toStatusId),
    [allowedTransitions]
  );

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      const issue = issues.find((i) => i.id === active.id);
      if (issue) setActiveIssue(issue);
    },
    [issues]
  );

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    setDragOverStatusId(over ? String(over.id) : null);
  }, []);

  const handleDragEnd = useCallback(
    async ({ active, over }: DragEndEvent) => {
      setActiveIssue(null);
      setDragOverStatusId(null);

      if (!over || active.id === over.id) return;

      const newStatusId = over.id as string;
      const issue = issues.find((i) => i.id === active.id);
      if (!issue || issue.statusId === newStatusId) return;

      // Hard-block disallowed transitions on the client side
      if (!checkTransition(issue.statusId, newStatusId)) return;

      const previousIssues = issues;

      setIssues((prev) =>
        prev.map((i) => (i.id === issue.id ? { ...i, statusId: newStatusId } : i))
      );

      try {
        const res = await fetch(`/api/v1/issues/${issue.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId: newStatusId }),
        });
        if (!res.ok) throw new Error("Failed to update issue status.");
      } catch (error) {
        console.error("[Board] drag-and-drop update failed:", error);
        setIssues(previousIssues);
      }
    },
    [issues, checkTransition]
  );

  const issuesByStatus = statuses.reduce<Record<string, Issue[]>>((acc, status) => {
    acc[status.id] = issues.filter((issue) => issue.statusId === status.id);
    return acc;
  }, {});

  const statusesByCategory = statuses.reduce<Record<StatusCategory, Status[]>>(
    (acc, status) => {
      acc[status.category].push(status);
      return acc;
    },
    { TODO: [], IN_PROGRESS: [], DONE: [] }
  );

  return (
    <div className="flex items-start flex-1 min-h-0">
      {/* Columns — horizontally scrollable, grouped by status category */}
      <div className="flex-1 min-w-0 overflow-x-auto h-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex h-full">
            {CATEGORY_ORDER.filter((cat) => statusesByCategory[cat].length > 0).map((cat) => (
              <CategoryColumn
                key={cat}
                category={cat}
                statuses={statusesByCategory[cat]}
                issuesByStatus={issuesByStatus}
                canEdit={canEdit}
                slug={slug}
                allowedTransitions={allowedTransitions}
                activeIssue={activeIssue}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeIssue && (
              <IssueCard {...activeIssue} canEdit={canEdit} slug={slug} overlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Issue detail panel */}
      {selectedIssue && (
        <div className="w-[460px] shrink-0 border-l h-full overflow-y-auto">
          <IssuePanel
              key={selectedIssue.id}
              issue={selectedIssue}
              users={users}
              canEdit={canEdit}
              slug={slug}
              projectIssues={issues.map((i) => ({
                id: i.id,
                identifier: i.identifier,
                title: i.title,
              }))}
            />
        </div>
      )}
    </div>
  );
}
