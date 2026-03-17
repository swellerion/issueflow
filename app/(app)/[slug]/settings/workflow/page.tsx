import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/services/projects.service";
import { getWorkflows } from "@/lib/services/workflows.service";
import { WorkflowSettingsForm } from "@/components/settings/workflow-settings-form";

type Props = { params: Promise<{ slug: string }> };

export default async function WorkflowSettingsPage({ params }: Props) {
  const { slug } = await params;

  const [project, workflows] = await Promise.all([
    getProjectBySlug(slug),
    getWorkflows(),
  ]);

  if (!project) notFound();

  return (
    <WorkflowSettingsForm
      projectId={project.id}
      currentWorkflowId={project.workflowId ?? null}
      workflows={workflows.map((w) => ({
        id: w.id,
        name: w.name,
        description: w.description ?? null,
        projectCount: w._count.projects,
      }))}
    />
  );
}
