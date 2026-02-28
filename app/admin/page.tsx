import Link from "next/link";
import { getProjectsWithStats } from "@/lib/services/projects.service";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const projects = await getProjectsWithStats();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">All projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new?next=/admin">New project</Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-md border border-dashed px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No projects yet.</p>
          <Button asChild>
            <Link href="/projects/new?next=/admin">Create the first project</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border divide-y">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{project.name}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {project.slug}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                <span>
                  {project._count.memberships}{" "}
                  {project._count.memberships === 1 ? "member" : "members"}
                </span>
                <span>
                  {project._count.issues}{" "}
                  {project._count.issues === 1 ? "issue" : "issues"}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${project.slug}/board`}>Board</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${project.slug}/settings/members`}>Members</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
