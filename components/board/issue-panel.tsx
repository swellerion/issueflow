"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X, ExternalLink, Plus,
  Bug, CheckSquare2, Sparkles, BookOpen, CircleDot,
  type LucideProps,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RichTextEditorDynamic } from "@/components/ui/rich-text-editor-dynamic";
import { RichTextViewer } from "@/components/ui/rich-text-viewer";
import { isRichTextEmpty } from "@/lib/rich-text";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  "bug": Bug,
  "check-square-2": CheckSquare2,
  "sparkles": Sparkles,
  "book-open": BookOpen,
  "circle-dot": CircleDot,
};

type User = { id: string; username: string };
type Status = { id: string; name: string; color: string; position: number };
type IssueType = { id: string; name: string; icon: string; color: string };
type Comment = { id: string; body: string; createdAt: Date | string; author: User & { id: string } };

type LinkedIssueRef = { id: string; identifier: string; title: string; status: { name: string; color: string } };

export type PanelIssue = {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  createdAt: Date | string;
  statusId: string;
  issueTypeId: string | null;
  status: Status;
  issueType: IssueType | null;
  author: User;
  assignee: User | null;
  comments: Comment[];
  project: { id: string; name: string; statuses: Status[]; issueTypes: IssueType[] };
  linksFrom: { id: string; type: string; toIssue: LinkedIssueRef }[];
  linksTo:   { id: string; type: string; fromIssue: LinkedIssueRef }[];
};

type ProjectIssue = { id: string; identifier: string; title: string };

const LINK_LABELS: Record<string, string> = {
  BLOCKS: "blocks",
  RELATES_TO: "relates to",
  DUPLICATES: "duplicates",
};

type LinkedIssuesSectionProps = {
  issueId: string;
  linksFrom: { id: string; type: string; toIssue: LinkedIssueRef }[];
  linksTo:   { id: string; type: string; fromIssue: LinkedIssueRef }[];
  projectIssues: ProjectIssue[];
  canEdit: boolean;
  addingLink: boolean;
  linkDirection: string;
  linkTarget: string;
  slug: string;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onDirectionChange: (v: string) => void;
  onTargetChange: (v: string) => void;
  onAddLink: () => void;
  onRemoveLink: (id: string) => void;
};

function LinkedIssuesSection({
  issueId, linksFrom, linksTo, projectIssues, canEdit,
  addingLink, linkDirection, linkTarget, slug,
  onStartAdding, onCancelAdding, onDirectionChange, onTargetChange, onAddLink, onRemoveLink,
}: LinkedIssuesSectionProps) {
  const allLinks = [
    ...linksFrom.map((l) => ({
      id: l.id,
      label: LINK_LABELS[l.type] ?? l.type.toLowerCase(),
      targetId: l.toIssue.id,
      identifier: l.toIssue.identifier,
      title: l.toIssue.title,
      statusColor: l.toIssue.status.color,
    })),
    ...linksTo.map((l) => ({
      id: l.id,
      label: l.type === "BLOCKS" ? "is blocked by"
           : l.type === "DUPLICATES" ? "is duplicated by"
           : "relates to",
      targetId: l.fromIssue.id,
      identifier: l.fromIssue.identifier,
      title: l.fromIssue.title,
      statusColor: l.fromIssue.status.color,
    })),
  ];

  const availableIssues = projectIssues.filter((i) => i.id !== issueId);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Linked issues</h3>

      {allLinks.length === 0 && !addingLink && (
        <p className="text-xs text-muted-foreground">No linked issues.</p>
      )}

      {allLinks.map((link) => (
        <div key={link.id} className="flex items-start gap-2 text-xs">
          <span className="text-muted-foreground w-24 shrink-0 pt-0.5 leading-tight">
            {link.label}
          </span>
          <Link
            href={`/${slug}/board?issueId=${link.targetId}`}
            className="flex-1 hover:underline min-w-0"
          >
            <span
              className="font-mono text-[10px] px-1 rounded border"
              style={{ borderColor: link.statusColor, color: link.statusColor }}
            >
              {link.identifier}
            </span>{" "}
            <span className="text-foreground truncate">{link.title}</span>
          </Link>
          {canEdit && (
            <button
              onClick={() => onRemoveLink(link.id)}
              className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-0.5"
              aria-label="Remove link"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        addingLink ? (
          <div className="space-y-2 pt-1">
            <div className="flex gap-1.5">
              <Select value={linkDirection} onValueChange={onDirectionChange}>
                <SelectTrigger className="h-7 text-xs w-36 px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLOCKS">blocks</SelectItem>
                  <SelectItem value="IS_BLOCKED_BY">is blocked by</SelectItem>
                  <SelectItem value="RELATES_TO">relates to</SelectItem>
                  <SelectItem value="DUPLICATES">duplicates</SelectItem>
                </SelectContent>
              </Select>
              <Select value={linkTarget} onValueChange={onTargetChange}>
                <SelectTrigger className="h-7 text-xs flex-1 px-2">
                  <SelectValue placeholder="Select issue…" />
                </SelectTrigger>
                <SelectContent>
                  {availableIssues.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="font-mono text-muted-foreground">{i.identifier}</span>
                      {" "}{i.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="h-7 text-xs" onClick={onAddLink} disabled={!linkTarget}>
                Add
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancelAdding}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={onStartAdding}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-0.5"
          >
            <Plus className="h-3 w-3" />
            Add link
          </button>
        )
      )}
    </div>
  );
}

type Props = {
  issue: PanelIssue;
  users: User[];
  canEdit: boolean;
  projectIssues: ProjectIssue[];
  slug: string;
  currentUserId: string;
};

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function IssuePanel({ issue, users, canEdit, projectIssues, slug, currentUserId }: Props) {
  const router = useRouter();

  const [statusId, setStatusId] = useState(issue.statusId);
  const [issueTypeId, setIssueTypeId] = useState(issue.issueType?.id ?? "none");
  const [assigneeId, setAssigneeId] = useState(issue.assignee?.id ?? "none");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(issue.title);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionValue, setDescriptionValue] = useState(issue.description ?? "");
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [deleteCommentError, setDeleteCommentError] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [linkDirection, setLinkDirection] = useState("BLOCKS");
  const [linkTarget, setLinkTarget] = useState("");

  const currentStatus =
    issue.project.statuses.find((s) => s.id === statusId) ?? issue.status;

  async function patchIssue(data: Record<string, unknown>) {
    await fetch(`/api/v1/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function handleStatusChange(value: string) {
    setStatusId(value);
    await patchIssue({ statusId: value });
  }

  async function handleIssueTypeChange(value: string) {
    setIssueTypeId(value);
    await patchIssue({ issueTypeId: value === "none" ? null : value });
  }

  async function handleAssigneeChange(value: string) {
    setAssigneeId(value);
    await patchIssue({ assigneeId: value === "none" ? null : value });
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

  async function handleAddLink() {
    if (!linkTarget) return;
    await fetch(`/api/v1/issues/${issue.id}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetIssueId: linkTarget, direction: linkDirection }),
    });
    setAddingLink(false);
    setLinkDirection("BLOCKS");
    setLinkTarget("");
    router.refresh();
  }

  async function handleRemoveLink(linkId: string) {
    await fetch(`/api/v1/issues/${issue.id}/links/${linkId}`, { method: "DELETE" });
    router.refresh();
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

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
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
        <div className="flex items-center gap-1">
          <Link
            href={`/${slug}/issues/${issue.id}`}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Open full page"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/${slug}/board`}
            className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 space-y-4">
          {/* Title */}
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
              className="text-sm font-semibold h-auto py-1"
            />
          ) : (
            <h2
              className={`text-sm font-semibold leading-snug ${
                canEdit
                  ? "cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1"
                  : ""
              }`}
              onClick={() => canEdit && setEditingTitle(true)}
            >
              {titleValue}
            </h2>
          )}

          {/* Meta — 3-col grid */}
          <div className="grid grid-cols-3 gap-x-3 gap-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              {canEdit ? (
                <Select value={statusId} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-7 text-xs px-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {issue.project.statuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs">{currentStatus.name}</span>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Type</p>
              {canEdit ? (
                <Select value={issueTypeId} onValueChange={handleIssueTypeChange}>
                  <SelectTrigger className="h-7 text-xs px-2">
                    <SelectValue placeholder="No type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No type</SelectItem>
                    {issue.project.issueTypes.map((t) => {
                      const Icon = ICON_MAP[t.icon] ?? CircleDot;
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-1.5">
                            <Icon className="h-3 w-3" style={{ color: t.color }} />
                            {t.name}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-xs">{issue.issueType?.name ?? "—"}</span>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Assignee</p>
              {canEdit ? (
                <Select value={assigneeId} onValueChange={handleAssigneeChange}>
                  <SelectTrigger className="h-7 text-xs px-2">
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
                <span className="text-xs">
                  {issue.assignee?.username ?? "Unassigned"}
                </span>
              )}
            </div>
          </div>

          {/* Author + date */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>
              Author:{" "}
              <span className="text-foreground">{issue.author.username}</span>
            </span>
            <span>
              Created:{" "}
              <span className="text-foreground">{formatDate(issue.createdAt)}</span>
            </span>
          </div>

          <Separator />

          {/* Description */}
          {canEdit && editingDescription ? (
            <div className="space-y-1.5">
              <RichTextEditorDynamic
                content={descriptionValue}
                onChange={setDescriptionValue}
                placeholder="Add a description…"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-7 text-xs" onClick={handleDescriptionSave}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setDescriptionValue(issue.description ?? "");
                    setEditingDescription(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : canEdit ? (
            <div
              className="cursor-pointer rounded px-1 -mx-1 hover:bg-muted/50 min-h-[2rem]"
              onClick={() => setEditingDescription(true)}
            >
              {descriptionValue && !isRichTextEmpty(descriptionValue) ? (
                <RichTextViewer html={descriptionValue} className="text-muted-foreground" />
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Click to add a description…
                </p>
              )}
            </div>
          ) : issue.description && !isRichTextEmpty(issue.description) ? (
            <RichTextViewer html={issue.description} className="text-muted-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground italic">No description.</p>
          )}

          <Separator />

          {/* Linked issues */}
          <LinkedIssuesSection
            issueId={issue.id}
            linksFrom={issue.linksFrom}
            linksTo={issue.linksTo}
            projectIssues={projectIssues}
            canEdit={canEdit}
            addingLink={addingLink}
            linkDirection={linkDirection}
            linkTarget={linkTarget}
            slug={slug}
            onStartAdding={() => setAddingLink(true)}
            onCancelAdding={() => { setAddingLink(false); setLinkDirection("BLOCKS"); setLinkTarget(""); }}
            onDirectionChange={setLinkDirection}
            onTargetChange={setLinkTarget}
            onAddLink={handleAddLink}
            onRemoveLink={handleRemoveLink}
          />

          <Separator />

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">
              Activity{" "}
              <span className="text-muted-foreground font-normal">
                ({issue.comments.length})
              </span>
            </h3>

            {issue.comments.length === 0 && (
              <p className="text-xs text-muted-foreground">No comments yet.</p>
            )}
            {deleteCommentError && (
              <p className="text-xs text-destructive">{deleteCommentError}</p>
            )}

            {issue.comments.map((comment) => (
              <div key={comment.id} className="flex gap-2">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[9px]">
                    {comment.author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {comment.author.username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                    {(comment.author.id === currentUserId || canEdit) && (
                      <button
                        disabled={deletingCommentId === comment.id}
                        onClick={async () => {
                          setDeletingCommentId(comment.id);
                          setDeleteCommentError(null);
                          const res = await fetch(`/api/v1/issues/${issue.id}/comments/${comment.id}`, { method: "DELETE" });
                          setDeletingCommentId(null);
                          if (!res.ok) {
                            const data = await res.json().catch(() => ({}));
                            setDeleteCommentError(data.error ?? "Failed to delete comment.");
                          } else {
                            router.refresh();
                          }
                        }}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                        aria-label="Delete comment"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <RichTextViewer html={comment.body} />
                </div>
              </div>
            ))}

            <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
              <Avatar className="h-6 w-6 shrink-0 mt-1.5">
                <AvatarFallback className="text-[9px]">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1.5">
                {commentError && (
                  <p className="text-xs text-destructive">{commentError}</p>
                )}
                <RichTextEditorDynamic
                  content={commentBody}
                  onChange={setCommentBody}
                  placeholder="Add a comment…"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingComment || isRichTextEmpty(commentBody)}
                >
                  {submittingComment ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
