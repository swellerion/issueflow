import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjectBySlug, getMembership, getMembers } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { MembersForm } from "@/components/settings/members-form";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function MembersSettingsPage({ params }: Props) {
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

  const members = await getMembers(project.id);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Members</h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>
      <MembersForm
        projectId={project.id}
        members={members}
        currentUserId={session.user.id}
      />
    </div>
  );
}
