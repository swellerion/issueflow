import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectBySlug, getMembership } from "@/lib/services/projects.service";
import { getProjectBoard, getIssueById } from "@/lib/services/issues.service";
import { getUsers, getUserFlags } from "@/lib/services/users.service";
import { canEditIssue } from "@/lib/permissions";
import { Board } from "@/components/board/board";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ issueId?: string }>;
};

export default async function BoardPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const { issueId } = await searchParams;

  const [{ project: boardProject, issues }, membership, users] = await Promise.all([
    getProjectBoard(project.id),
    getMembership(project.id, session.user.id),
    getUsers(),
  ]);

  const canEdit = canEditIssue(membership?.role ?? null, isSuperAdmin);

  let selectedIssue = null;
  if (issueId) {
    const issue = await getIssueById(issueId);
    if (issue?.project.id === project.id) {
      selectedIssue = issue;
    }
  }

  // Build allowed transitions map when a workflow is adopted.
  // If workflowId is set but no transitions matched (e.g. all state names unrecognised),
  // pass an empty map {} so all moves are blocked — not null (which means unrestricted).
  const allowedTransitions: Record<string, string[]> | null = boardProject?.workflowId
    ? boardProject.statusTransitions.reduce<Record<string, string[]>>((acc, t) => {
        (acc[t.fromStatusId] ??= []).push(t.toStatusId);
        return acc;
      }, {})
    : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-6">
      <div className="shrink-0 mb-5">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.slug.toUpperCase()} · {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Board
        statuses={project.statuses}
        issueTypes={boardProject?.issueTypes ?? []}
        issues={issues}
        canEdit={canEdit}
        selectedIssue={selectedIssue}
        users={users}
        slug={slug}
        allowedTransitions={allowedTransitions}
        currentUserId={session.user.id}
      />
    </div>
  );
}
