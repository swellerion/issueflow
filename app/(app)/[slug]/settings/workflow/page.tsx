import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjectBySlug, getMembership } from "@/lib/services/projects.service";
import { getWorkflows } from "@/lib/services/workflows.service";
import { canManageMembers } from "@/lib/permissions";
import { WorkflowSettingsForm } from "@/components/settings/workflow-settings-form";
import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

export default async function WorkflowSettingsPage({ params }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const membership = await getMembership(project.id, session.user.id);
  if (!canManageMembers(membership?.role ?? null, isSuperAdmin)) {
    redirect(`/${slug}/board`);
  }

  const [workflows, fullProject] = await Promise.all([
    getWorkflows(),
    db.project.findUnique({
      where: { id: project.id },
      select: { workflowId: true },
    }),
  ]);

  return (
    <WorkflowSettingsForm
      projectId={project.id}
      currentWorkflowId={fullProject?.workflowId ?? null}
      workflows={workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        projectCount: w._count.projects,
      }))}
    />
  );
}
