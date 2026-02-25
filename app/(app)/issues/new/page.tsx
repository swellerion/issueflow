import { redirect } from "next/navigation";
import { getProjects } from "@/lib/services/projects.service";
import { getUsers } from "@/lib/services/users.service";
import { NewIssueForm } from "@/components/issues/new-issue-form";

type Props = {
  searchParams: Promise<{ statusId?: string }>;
};

export default async function NewIssuePage({ searchParams }: Props) {
  const [projects, users] = await Promise.all([getProjects(), getUsers()]);

  if (projects.length === 0) redirect("/projects/new");

  const project = projects[0];
  const { statusId } = await searchParams;

  const defaultStatus =
    project.statuses.find((s) => s.id === statusId) ?? project.statuses[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Create issue</h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>
      <NewIssueForm
        statuses={project.statuses}
        defaultStatusId={defaultStatus.id}
        users={users}
      />
    </div>
  );
}
