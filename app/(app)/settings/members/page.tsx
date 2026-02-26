import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects, getMembership, getMembers } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { MembersForm } from "@/components/settings/members-form";

export default async function MembersSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const projects = await getProjects(session.user.id, isSuperAdmin);
  if (projects.length === 0) redirect("/projects/new");

  const project = projects[0];
  const membership = await getMembership(project.id, session.user.id);

  if (!canManageMembers(membership?.role ?? null, isSuperAdmin)) {
    redirect("/board");
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
