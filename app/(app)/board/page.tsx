import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjects, getMembership } from "@/lib/services/projects.service";
import { getProjectBoard } from "@/lib/services/issues.service";
import { getUserFlags } from "@/lib/services/users.service";
import { canEditIssue } from "@/lib/permissions";
import { Board } from "@/components/board/board";

export default async function BoardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const projects = await getProjects(session.user.id, isSuperAdmin);

  if (projects.length === 0) {
    redirect("/projects/new");
  }

  const project = projects[0];
  const [{ issues }, membership] = await Promise.all([
    getProjectBoard(project.id),
    getMembership(project.id, session.user.id),
  ]);

  const canEdit = canEditIssue(membership?.role ?? null, isSuperAdmin);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.slug.toUpperCase()} · {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Board statuses={project.statuses} issues={issues} canEdit={canEdit} />
    </div>
  );
}
