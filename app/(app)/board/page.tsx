import { redirect } from "next/navigation";
import { getProjects } from "@/lib/services/projects.service";
import { getProjectBoard } from "@/lib/services/issues.service";
import { Board } from "@/components/board/board";

export default async function BoardPage() {
  const projects = await getProjects();

  if (projects.length === 0) {
    redirect("/projects/new");
  }

  const project = projects[0];
  const { issues } = await getProjectBoard(project.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold">{project.name}</h1>
        <p className="text-sm text-muted-foreground">
          {project.slug.toUpperCase()} · {issues.length} issue{issues.length !== 1 ? "s" : ""}
        </p>
      </div>
      <Board statuses={project.statuses} issues={issues} />
    </div>
  );
}
