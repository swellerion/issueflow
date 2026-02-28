import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects } from "@/lib/services/projects.service";

export default async function MembersSettingsRedirect() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  const projects = await getProjects(session.user.id, isSuperAdmin);

  if (projects.length === 0) redirect("/projects/new");
  redirect(`/${projects[0].slug}/settings/members`);
}
