import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getIssueById } from "@/lib/services/issues.service";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function IssueRedirect({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const issue = await getIssueById(id);
  if (!issue) notFound();

  redirect(`/${issue.project.slug}/issues/${id}`);
}
