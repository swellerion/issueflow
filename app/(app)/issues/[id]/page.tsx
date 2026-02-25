import { notFound } from "next/navigation";
import { getIssueById } from "@/lib/services/issues.service";
import { getUsers } from "@/lib/services/users.service";
import { IssueDetail } from "@/components/issues/issue-detail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function IssueDetailPage({ params }: Props) {
  const { id } = await params;
  const [issue, users] = await Promise.all([getIssueById(id), getUsers()]);

  if (!issue) notFound();

  return <IssueDetail issue={issue} users={users} />;
}
