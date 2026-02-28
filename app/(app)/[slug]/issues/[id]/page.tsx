import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIssueById, getProjectBoard } from "@/lib/services/issues.service";
import { getUsers, getUserFlags } from "@/lib/services/users.service";
import { getMembership } from "@/lib/services/projects.service";
import { canEditIssue } from "@/lib/permissions";
import { IssueDetail } from "@/components/issues/issue-detail";

type Props = {
  params: Promise<{ slug: string; id: string }>;
};

export default async function IssueDetailPage({ params }: Props) {
  const { slug, id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [issue, users] = await Promise.all([getIssueById(id), getUsers()]);
  if (!issue) notFound();

  // Verify this issue belongs to the correct project
  if (issue.project.slug !== slug) notFound();

  const [{ issues: projectIssues }, membership, userFlags] = await Promise.all([
    getProjectBoard(issue.project.id),
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);

  const canEdit = canEditIssue(membership?.role ?? null, userFlags?.isSuperAdmin ?? false);

  return (
    <IssueDetail
      issue={issue}
      users={users}
      canEdit={canEdit}
      slug={slug}
      projectIssues={projectIssues.map((i) => ({
        id: i.id,
        identifier: i.identifier,
        title: i.title,
      }))}
    />
  );
}
