"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bug, CheckSquare2, Sparkles, BookOpen, CircleDot, type LucideProps } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditorDynamic } from "@/components/ui/rich-text-editor-dynamic";
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

type Status = { id: string; name: string; color: string };
type IssueType = { id: string; name: string; icon: string; color: string };
type User = { id: string; username: string };

type Props = {
  statuses: Status[];
  defaultStatusId: string;
  issueTypes: IssueType[];
  defaultIssueTypeId: string;
  users: User[];
  projectId: string;
  slug: string;
};

export function NewIssueForm({ statuses, defaultStatusId, issueTypes, defaultIssueTypeId, users, projectId, slug }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState(defaultStatusId);
  const [issueTypeId, setIssueTypeId] = useState(defaultIssueTypeId);
  const [assigneeId, setAssigneeId] = useState<string>("none");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const title = form.get("title") as string;

    const res = await fetch("/api/v1/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: isRichTextEmpty(description) ? undefined : description,
        statusId,
        issueTypeId: issueTypeId || undefined,
        assigneeId: assigneeId === "none" ? undefined : assigneeId,
        projectId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to create issue.");
      setLoading(false);
      return;
    }

    router.push(`/${slug}/issues/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          placeholder="Short, descriptive title"
          required
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <RichTextEditorDynamic
          content={description}
          onChange={setDescription}
          placeholder="Add more details…"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={issueTypeId} onValueChange={setIssueTypeId} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {issueTypes.map((t) => {
                const Icon = ICON_MAP[t.icon] ?? CircleDot;
                return (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: t.color }} />
                      {t.name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={statusId} onValueChange={setStatusId} disabled={loading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
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
        </div>

        <div className="space-y-2">
          <Label>Assignee</Label>
          <Select
            value={assigneeId}
            onValueChange={setAssigneeId}
            disabled={loading}
          >
            <SelectTrigger>
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
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create issue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
