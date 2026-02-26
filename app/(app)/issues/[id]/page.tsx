import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIssueById } from "@/lib/services/issues.service";
import { getUsers } from "@/lib/services/users.service";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership } from "@/lib/services/projects.service";
import { canEditIssue } from "@/lib/permissions";
import { IssueDetail } from "@/components/issues/issue-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();

  const [issue, users] = await Promise.all([getIssueById(id), getUsers()]);

  if (!issue) notFound();

  let canEdit = false;
  if (session?.user?.id) {
    const [membership, userFlags] = await Promise.all([
      getMembership(issue.project.id, session.user.id),
      getUserFlags(session.user.id),
    ]);
    canEdit = canEditIssue(membership?.role ?? null, userFlags?.isSuperAdmin ?? false);
  }

  return <IssueDetail issue={issue} users={users} canEdit={canEdit} />;
}
