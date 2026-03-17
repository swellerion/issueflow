import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getWorkflowById } from "@/lib/services/workflows.service";
import { WorkflowCanvas } from "@/components/workflows/workflow-canvas-loader";
import { ArrowLeft, ExternalLink } from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workflow = await getWorkflowById(id);
  if (!workflow) notFound();

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  const canEdit = isSuperAdmin || workflow.createdById === session.user.id;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-1px)] -m-6 overflow-hidden">
      {/* Sub-header */}
      <div className="flex items-center gap-3 px-5 h-12 border-b shrink-0">
        <Link
          href="/workflows"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Back to workflows"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{workflow.name}</span>
          {workflow.description && (
            <span className="text-xs text-muted-foreground ml-2 truncate hidden sm:inline">
              {workflow.description}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          by {workflow.createdBy.username}
        </span>
        {!canEdit && (
          <Link
            href="/workflows"
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
            Adopt
          </Link>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <WorkflowCanvas
          workflowId={workflow.id}
          initialStates={workflow.states}
          initialTransitions={workflow.transitions}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
