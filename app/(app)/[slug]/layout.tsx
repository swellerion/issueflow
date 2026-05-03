import { notFound, redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects, getProjectBySlug, getMembership } from "@/lib/services/projects.service";
import { canManageMembers } from "@/lib/permissions";
import { Nav } from "@/components/nav";

export default async function SlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  if (!userFlags) await signOut({ redirectTo: "/login" });
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;

  const [project, projects] = await Promise.all([
    getProjectBySlug(slug),
    getProjects(session.user.id, isSuperAdmin),
  ]);

  if (!project) notFound();

  const membership = await getMembership(project.id, session.user.id);
  if (!membership && !isSuperAdmin) notFound();

  const showSettings = canManageMembers(membership?.role ?? null, isSuperAdmin);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Nav
        project={{ name: project.name, slug: project.slug }}
        projects={projects.map((p) => ({ name: p.name, slug: p.slug }))}
        showSettings={showSettings}
        isSuperAdmin={isSuperAdmin}
        showWorkflows={showSettings}
      />
      <main className="flex flex-col flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
