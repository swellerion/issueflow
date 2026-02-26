import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects, getMembership } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  let showSettings = false;
  if (session?.user?.id) {
    const userFlags = await getUserFlags(session.user.id);
    const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
    const projects = await getProjects(session.user.id, isSuperAdmin);
    if (projects.length > 0) {
      const membership = await getMembership(projects[0].id, session.user.id);
      showSettings = canManageMembers(membership?.role ?? null, isSuperAdmin);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Nav showSettings={showSettings} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
