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

  const [{ issues }, membership] = await Promise.all([
    getProjectBoard(project.id),
    getMembership(project.id, session.user.id),
  ]);

  const canEdit = canEditIssue(membership?.role ?? null, isSuperAdmin);

  let selectedIssue = null;
  let users: { id: string; username: string }[] = [];
  if (issueId) {
    const [issue, allUsers] = await Promise.all([
      getIssueById(issueId),
      getUsers(),
    ]);
    if (issue?.project.id === project.id) {
      selectedIssue = issue;
      users = allUsers;
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)]">
      <div className="shrink-0 mb-5">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.slug.toUpperCase()} · {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Board
        statuses={project.statuses}
        issues={issues}
        canEdit={canEdit}
        selectedIssue={selectedIssue}
        users={users}
        slug={slug}
      />
    </div>
  );
}
