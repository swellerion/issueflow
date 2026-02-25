"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { IssueCard } from "@/components/board/issue-card";

type Issue = {
  id: string;
  identifier: string;
  title: string;
  statusId: string;
  assignee: { id: string; username: string } | null;
};

type ColumnProps = {
  id: string;
  name: string;
  color: string;
  issues: Issue[];
};

export function Column({ id, name, color, issues }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-sm font-medium">{name}</h2>
          <span className="text-xs text-muted-foreground">{issues.length}</span>
        </div>
        <Link
          href={`/issues/new?statusId=${id}`}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={`Add issue to ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-24 rounded-lg p-1 transition-colors
          ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}
        `}
      >
        {issues.map((issue) => (
          <IssueCard key={issue.id} {...issue} />
        ))}
      </div>
    </div>
  );
}
