"use client";

import { Column } from "@/components/board/column";
import { getCategoryMeta, type StatusCategory } from "@/lib/status-category";
import { isTransitionAllowed, type AllowedTransitions } from "@/lib/allowed-transitions";

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

type CategoryColumnProps = {
  category: StatusCategory;
  statuses: Status[];
  issuesByStatus: Record<string, Issue[]>;
  canEdit: boolean;
  slug: string;
  allowedTransitions: AllowedTransitions;
  activeIssue: { id: string; statusId: string } | null;
};

export function CategoryColumn({
  category,
  statuses,
  issuesByStatus,
  canEdit,
  slug,
  allowedTransitions,
  activeIssue,
}: CategoryColumnProps) {
  const cat = getCategoryMeta(category);
  const totalIssues = statuses.reduce(
    (sum, s) => sum + (issuesByStatus[s.id]?.length ?? 0),
    0
  );


  return (
    <div className="flex flex-col flex-1 min-w-0 h-full border-r last:border-r-0 border-border">
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border"
        style={{ borderLeftWidth: 3, borderLeftColor: cat.color }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: cat.color }}
        >
          {cat.label}
        </span>
        <span className="text-xs text-muted-foreground">{totalIssues}</span>
      </div>
      <div className="flex divide-x divide-border flex-1 min-h-0">
        {statuses.map((status) => {
          const isDisabled =
            !!activeIssue &&
            activeIssue.statusId !== status.id &&
            !isTransitionAllowed(allowedTransitions, activeIssue.statusId, status.id);

          return (
            <Column
              key={status.id}
              id={status.id}
              name={status.name}
              color={status.color}
              issues={(issuesByStatus[status.id] ?? []).map((i) => ({
                ...i,
                isBlocked: i.linksTo.length > 0,
              }))}
              canEdit={canEdit}
              slug={slug}
              isDisabled={isDisabled}
            />
          );
        })}
      </div>
    </div>
  );
}
