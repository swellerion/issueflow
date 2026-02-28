import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects } from "@/lib/services/projects.service";
import Link from "next/link";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  const projects = await getProjects(session.user.id, isSuperAdmin);

  if (isSuperAdmin) redirect("/admin");
  if (projects.length === 0) redirect("/projects/new");
  if (projects.length === 1) redirect(`/${projects[0].slug}/board`);

  // Multiple projects — show picker
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 max-w-sm w-full px-4">
        <h1 className="text-xl font-semibold">Select a project</h1>
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${p.slug}/board`}
                className="block rounded-md border px-4 py-3 text-sm hover:bg-muted transition-colors"
              >
                <span className="font-medium">{p.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">{p.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
