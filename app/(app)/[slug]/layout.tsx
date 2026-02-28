import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
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
  if (!session?.user?.id) notFound();

  const userFlags = await getUserFlags(session.user.id);
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
    <div className="flex min-h-screen flex-col">
      <Nav
        project={{ name: project.name, slug: project.slug }}
        projects={projects.map((p) => ({ name: p.name, slug: p.slug }))}
        showSettings={showSettings}
        isSuperAdmin={isSuperAdmin}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
