import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjectBySlug, getMembership } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { StatusesForm } from "@/components/settings/statuses-form";

type Props = { params: Promise<{ slug: string }> };

export default async function StatusesSettingsPage({ params }: Props) {
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

  return <StatusesForm projectId={project.id} initialStatuses={project.statuses} />;
}
