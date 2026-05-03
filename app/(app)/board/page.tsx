import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects } from "@/lib/services/projects.service";

export default async function BoardRedirect() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  if (!userFlags) await signOut({ redirectTo: "/login" });

  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  const projects = await getProjects(session.user.id, isSuperAdmin);

  if (projects.length === 0) redirect("/projects/new");
  redirect(`/${projects[0].slug}/board`);
}
