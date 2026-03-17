"use client";

import { useState } from "react";
import { Plus, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STATUS_CATEGORIES, type StatusCategory } from "@/lib/status-category";

type AddStateModalProps = {
  onAdd: (name: string, color: string, category: StatusCategory) => void;
  onClose: () => void;
};

function AddStateModal({ onAdd, onClose }: AddStateModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [category, setCategory] = useState<StatusCategory>("TODO");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, color, category);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-lg border shadow-lg p-6 w-80 space-y-4">
        <h3 className="font-semibold text-sm">Add State</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
              placeholder="e.g. In Review"
              maxLength={50}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as StatusCategory)}
              className="w-full rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              {STATUS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-10 cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground font-mono">{color}</span>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type WorkflowToolbarProps = {
  isDirty: boolean;
  isSaving: boolean;
  canEdit: boolean;
  onAddState: (name: string, color: string, category: StatusCategory) => void;
  onSave: () => void;
};

export function WorkflowToolbar({
  isDirty,
  isSaving,
  canEdit,
  onAddState,
  onSave,
}: WorkflowToolbarProps) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {isDirty && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5" />
            Unsaved changes
          </span>
        )}
        {canEdit && (
          <>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add state
            </Button>
            <Button
              size="sm"
              disabled={!isDirty || isSaving}
              onClick={onSave}
              title={!isDirty ? "No changes to save" : undefined}
            >
              <Save className="h-3.5 w-3.5 mr-1" />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </>
        )}
        {!canEdit && (
          <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
            Read-only
          </span>
        )}
      </div>

      {addOpen && (
        <AddStateModal onAdd={onAddState} onClose={() => setAddOpen(false)} />
      )}
    </>
  );
}
