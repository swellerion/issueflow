"use client";

import Link from "next/link";
import { GripVertical, ShieldAlert, Bug, CheckSquare2, Sparkles, BookOpen, CircleDot, type LucideProps } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  "bug": Bug,
  "check-square-2": CheckSquare2,
  "sparkles": Sparkles,
  "book-open": BookOpen,
  "circle-dot": CircleDot,
};

type IssueCardProps = {
  id: string;
  identifier: string;
  title: string;
  statusId: string;
  issueType?: { name: string; icon: string; color: string } | null;
  assignee: { id: string; username: string } | null;
  isBlocked?: boolean;
  canEdit: boolean;
  slug: string;
  overlay?: boolean;
};

export function IssueCard({ id, identifier, title, statusId, issueType, assignee, isBlocked, canEdit, slug, overlay }: IssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { statusId },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`issue-card-${id}`}
      className={`group flex items-start gap-1 rounded-md border bg-card shadow-sm transition-all
        ${isDragging && !overlay ? "opacity-40" : ""}
        ${overlay ? "shadow-lg rotate-1 cursor-grabbing" : "hover:shadow-md hover:border-primary/40"}
      `}
    >
      {/* Drag handle — only visible to editors */}
      {canEdit && (
        <button
          {...listeners}
          {...attributes}
          // dnd-kit generates aria-describedby with an internal counter-based ID
          // that can differ between SSR and client hydration. Suppress the warning
          // on this element only — dragging is a client-only interaction anyway.
          suppressHydrationWarning
          className="shrink-0 p-2 pt-2.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors touch-none"
          tabIndex={-1}
          aria-label="Drag to move issue"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Card content — clickable for navigation */}
      <Link href={`/${slug}/board?issueId=${id}`} className="flex-1 py-2.5 pr-3 space-y-2 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{title}</p>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            {issueType && (() => {
              const Icon = ICON_MAP[issueType.icon] ?? CircleDot;
              return <Icon className="h-3.5 w-3.5" style={{ color: issueType.color }} />;
            })()}
            <Badge
              variant="outline"
              className="text-xs font-mono text-muted-foreground"
            >
              {identifier}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isBlocked && (
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" aria-label="Blocked" />
            )}
            {assignee && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px]">
                  {assignee.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
