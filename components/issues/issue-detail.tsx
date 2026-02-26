"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type User = { id: string; username: string };
type Status = { id: string; name: string; color: string; position: number };
type Comment = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: User;
};

type Issue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  statusId: string;
  status: Status;
  author: User;
  assignee: User | null;
  comments: Comment[];
  project: { id: string; name: string; statuses: Status[] };
};

type Props = {
  issue: Issue;
  users: User[];
  canEdit: boolean;
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function IssueDetail({ issue, users, canEdit }: Props) {
  const router = useRouter();
  const [statusId, setStatusId] = useState(issue.statusId);
  const [assigneeId, setAssigneeId] = useState(issue.assignee?.id ?? "none");
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Inline title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);

  // Inline description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(issue.description ?? "");

  async function patchIssue(data: Record<string, unknown>) {
    await fetch(`/api/v1/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function handleStatusChange(newStatusId: string) {
    setStatusId(newStatusId);
    await patchIssue({ statusId: newStatusId });
  }

  async function handleAssigneeChange(value: string) {
    const newAssigneeId = value === "none" ? null : value;
    setAssigneeId(value);
    await patchIssue({ assigneeId: newAssigneeId });
  }

  async function handleTitleSave() {
    setEditingTitle(false);
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== issue.title) {
      await patchIssue({ title: trimmed });
    } else {
      setTitleValue(issue.title);
    }
  }

  async function handleDescriptionSave() {
    setEditingDescription(false);
    if (descriptionValue !== (issue.description ?? "")) {
      await patchIssue({ description: descriptionValue });
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    setCommentError(null);
    setSubmittingComment(true);

    const res = await fetch(`/api/v1/issues/${issue.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: commentBody }),
    });

    const data = await res.json();

    if (!res.ok) {
      setCommentError(data.error ?? "Failed to add comment.");
      setSubmittingComment(false);
      return;
    }

    setCommentBody("");
    setSubmittingComment(false);
    router.refresh();
  }

  const currentStatus =
    issue.project.statuses.find((s) => s.id === statusId) ?? issue.status;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        href="/board"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Board
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">
                {issue.identifier}
              </span>
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: currentStatus.color, color: currentStatus.color }}
              >
                {currentStatus.name}
              </Badge>
            </div>

            {/* Title — inline editable for ADMIN/MEMBER */}
            {canEdit && editingTitle ? (
              <Input
                autoFocus
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave();
                  if (e.key === "Escape") {
                    setTitleValue(issue.title);
                    setEditingTitle(false);
                  }
                }}
                className="text-2xl font-semibold h-auto py-1"
              />
            ) : (
              <h1
                className={`text-2xl font-semibold ${canEdit ? "cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1" : ""}`}
                onClick={() => canEdit && setEditingTitle(true)}
              >
                {titleValue}
              </h1>
            )}
          </div>

          {/* Description — inline editable for ADMIN/MEMBER */}
          {canEdit && editingDescription ? (
            <Textarea
              autoFocus
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDescriptionValue(issue.description ?? "");
                  setEditingDescription(false);
                }
              }}
              rows={5}
              placeholder="Add a description…"
            />
          ) : canEdit ? (
            <div
              className="cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 min-h-[2rem]"
              onClick={() => setEditingDescription(true)}
            >
              {descriptionValue ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {descriptionValue}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click to add a description…
                </p>
              )}
            </div>
          ) : issue.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {issue.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description.</p>
          )}

          <Separator />

          {/* Comments logbook */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium">
              Activity
              <span className="ml-1.5 text-muted-foreground font-normal">
                ({issue.comments.length})
              </span>
            </h2>

            {issue.comments.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            )}

            {issue.comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[10px]">
                    {comment.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{comment.author.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {comment.body}
                  </p>
                </div>
              </div>
            ))}

            {/* Add comment */}
            <form onSubmit={handleAddComment} className="flex gap-3">
              <Avatar className="h-7 w-7 shrink-0 mt-2">
                <AvatarFallback className="text-[10px]">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                {commentError && (
                  <p className="text-xs text-destructive">{commentError}</p>
                )}
                <Textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  disabled={submittingComment}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingComment || !commentBody.trim()}
                >
                  {submittingComment ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 text-sm">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Status
            </p>
            {canEdit ? (
              <Select value={statusId} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {issue.project.statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-8 items-center gap-2 rounded-md border px-3">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: currentStatus.color }}
                />
                <span className="text-sm">{currentStatus.name}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Assignee
            </p>
            {canEdit ? (
              <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-8 items-center rounded-md border px-3">
                <span className="text-sm">
                  {users.find((u) => u.id === (assigneeId === "none" ? null : assigneeId))?.username ?? "Unassigned"}
                </span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3 text-muted-foreground">
            <div className="flex justify-between">
              <span>Author</span>
              <span className="text-foreground">{issue.author.username}</span>
            </div>
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-foreground">{formatDate(issue.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
