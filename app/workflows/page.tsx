import Link from "next/link";
import { Plus } from "lucide-react";
import { getWorkflows } from "@/lib/services/workflows.service";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function WorkflowsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workflows = await getWorkflows();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Workflows</h1>
          <p className="text-sm text-muted-foreground">
            Define reusable status-transition rules for your projects.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/workflows/new">
            <Plus className="h-4 w-4 mr-1" />
            New workflow
          </Link>
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No workflows yet.{" "}
            <Link href="/workflows/new" className="underline underline-offset-2">
              Create one
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {workflows.map((w) => (
            <Link
              key={w.id}
              href={`/workflows/${w.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-muted/50 transition-colors group"
            >
              <div>
                <p className="font-medium text-sm group-hover:underline">{w.name}</p>
                {w.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{w.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  by {w.createdBy.username}
                </p>
              </div>
              <span className="text-xs text-muted-foreground rounded-full border px-2 py-0.5">
                {w._count.projects} project{w._count.projects !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
