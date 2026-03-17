"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type WorkflowOption = {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
};

type WorkflowSettingsFormProps = {
  projectId: string;
  currentWorkflowId: string | null;
  workflows: WorkflowOption[];
};

export function WorkflowSettingsForm({
  projectId,
  currentWorkflowId,
  workflows,
}: WorkflowSettingsFormProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(currentWorkflowId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<string[] | null>(null);

  async function handleAdopt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setUnmatched(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: selectedId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to adopt workflow.");
        return;
      }
      const result = await res.json();
      if (result.unmatched?.length > 0) {
        setUnmatched(result.unmatched);
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDetach() {
    setBusy(true);
    setError(null);
    setUnmatched(null);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/workflow`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to detach workflow.");
        return;
      }
      setSelectedId("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId);

  return (
    <div className="space-y-6">
      {currentWorkflow ? (
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm font-medium">Current workflow</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">{currentWorkflow.name}</p>
              {currentWorkflow.description && (
                <p className="text-xs text-muted-foreground">{currentWorkflow.description}</p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Link
                href={`/workflows/${currentWorkflow.id}`}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </Link>
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={handleDetach}
              >
                Detach
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No workflow adopted. Transition rules are unrestricted.
        </p>
      )}

      {unmatched && unmatched.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium mb-1">Some workflow states could not be matched:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {unmatched.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs">
            Transitions for these states were skipped. Check your project statuses match the
            workflow state names.
          </p>
        </div>
      )}

      <form onSubmit={handleAdopt} className="space-y-3">
        <p className="text-sm font-semibold">
          {currentWorkflow ? "Switch to a different workflow" : "Adopt a workflow"}
        </p>
        {workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflows available.{" "}
            <Link href="/workflows/new" className="underline">
              Create one first.
            </Link>
          </p>
        ) : (
          <>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— select a workflow —</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.projectCount > 0 ? ` (${w.projectCount} project${w.projectCount !== 1 ? "s" : ""})` : ""}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={busy || !selectedId || selectedId === currentWorkflowId}>
              {busy ? "Saving…" : currentWorkflow ? "Switch workflow" : "Adopt workflow"}
            </Button>
          </>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </div>
  );
}
