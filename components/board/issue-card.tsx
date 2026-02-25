"use client";

import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type IssueCardProps = {
  id: string;
  identifier: string;
  title: string;
  statusId: string;
  assignee: { id: string; username: string } | null;
  overlay?: boolean;
};

export function IssueCard({ id, identifier, title, statusId, assignee, overlay }: IssueCardProps) {
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
      className={`group flex items-start gap-1 rounded-md border bg-card shadow-sm transition-all
        ${isDragging && !overlay ? "opacity-40" : ""}
        ${overlay ? "shadow-lg rotate-1 cursor-grabbing" : "hover:shadow-md hover:border-primary/40"}
      `}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="shrink-0 p-2 pt-2.5 text-muted-foreground/30 hover:text-muted-foreground cursor-grab active:cursor-grabbing transition-colors touch-none"
        tabIndex={-1}
        aria-label="Drag to move issue"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Card content — clickable for navigation */}
      <Link href={`/issues/${id}`} className="flex-1 py-2.5 pr-3 space-y-2 min-w-0">
        <p className="text-sm font-medium leading-snug line-clamp-2">{title}</p>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className="text-xs font-mono text-muted-foreground shrink-0"
          >
            {identifier}
          </Badge>
          {assignee && (
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarFallback className="text-[10px]">
                {assignee.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </Link>
    </div>
  );
}
