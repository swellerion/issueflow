import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectBySlug } from "@/lib/services/projects.service";
import { getUsers } from "@/lib/services/users.service";
import { NewIssueForm } from "@/components/issues/new-issue-form";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ statusId?: string }>;
};

export default async function NewIssuePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [project, users] = await Promise.all([
    getProjectBySlug(slug),
    getUsers(),
  ]);

  if (!project) notFound();

  const { statusId } = await searchParams;
  const defaultStatus =
    project.statuses.find((s) => s.id === statusId) ?? project.statuses[0];
  const defaultIssueType = project.issueTypes[0];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Create issue</h1>
        <p className="text-sm text-muted-foreground">{project.name}</p>
      </div>
      <NewIssueForm
        statuses={project.statuses}
        defaultStatusId={defaultStatus.id}
        issueTypes={project.issueTypes}
        defaultIssueTypeId={defaultIssueType?.id ?? ""}
        users={users}
        projectId={project.id}
        slug={slug}
      />
    </div>
  );
}
