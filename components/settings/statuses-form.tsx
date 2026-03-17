"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_CATEGORIES, getCategoryMeta, type StatusCategory } from "@/lib/status-category";

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
  category: StatusCategory;
};

type StatusesFormProps = {
  projectId: string;
  initialStatuses: Status[];
};

export function StatusesForm({ projectId, initialStatuses }: StatusesFormProps) {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Status[]>(initialStatuses);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newCategory, setNewCategory] = useState<StatusCategory>("TODO");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/statuses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color: newColor, category: newCategory }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to add status.");
        return;
      }
      const created: Status = await res.json();
      setStatuses((prev) => [...prev, created]);
      setNewName("");
      setNewColor("#6366f1");
      setNewCategory("TODO");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(statusId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/projects/${projectId}/statuses/${statusId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete status.");
        return;
      }
      setStatuses((prev) => prev.filter((s) => s.id !== statusId));
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold mb-3">Current statuses</h2>
        <div className="divide-y rounded-lg border">
          {statuses.map((s) => {
            const cat = getCategoryMeta(s.category);
            return (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-sm">{s.name}</span>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none"
                    style={{ backgroundColor: cat.bg, color: cat.text }}
                  >
                    {cat.label}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={busy}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  title="Delete status"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          {statuses.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              No statuses. Add one below.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleAdd} className="space-y-3">
        <h2 className="text-sm font-semibold">Add status</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border"
            title="Status color"
          />
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 min-w-32 rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Status name"
            maxLength={50}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as StatusCategory)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
            aria-label="Board column"
            title="Board column — Determines which column group this status appears under on the board"
          >
            {STATUS_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <Button type="submit" size="sm" disabled={busy || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
