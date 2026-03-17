import { notFound } from "next/navigation";
import { getProjectBySlug } from "@/lib/services/projects.service";
import { StatusesForm } from "@/components/settings/statuses-form";

type Props = { params: Promise<{ slug: string }> };

export default async function StatusesSettingsPage({ params }: Props) {
  const { slug } = await params;

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  return <StatusesForm projectId={project.id} initialStatuses={project.statuses} />;
}
