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
  issueType?: { name: string; icon: string; color: string } | null;
  assignee: { id: string; username: string } | null;
  isBlocked?: boolean;
};

type ColumnProps = {
  id: string;
  name: string;
  color: string;
  issues: Issue[];
  canEdit: boolean;
  slug: string;
};

export function Column({ id, name, color, issues, canEdit, slug }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      className="flex flex-1 min-w-56 flex-col px-4 border-t-[3px] h-full"
      style={{ borderTopColor: color, backgroundColor: `${color}0d` }}
      data-testid={`column-${name.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="shrink-0 flex items-center justify-between pt-3 pb-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h2 className="text-sm font-medium">{name}</h2>
          <span className="text-xs text-muted-foreground">{issues.length}</span>
        </div>
        <Link
          href={`/${slug}/issues/new?statusId=${id}`}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title={`Add issue to ${name}`}
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div
        ref={setNodeRef}
        data-testid={`column-drop-${name.toLowerCase().replace(/\s+/g, "-")}`}
        className={`flex flex-col gap-2 flex-1 overflow-y-auto pb-3 rounded-lg p-1 transition-colors
          ${isOver ? "bg-primary/5 ring-1 ring-primary/20" : ""}
        `}
      >
        {issues.map((issue) => (
          <IssueCard key={issue.id} {...issue} canEdit={canEdit} slug={slug} />
        ))}
      </div>
    </div>
  );
}
