import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getProjects } from "@/lib/services/projects.service";

type Props = {
  searchParams: Promise<{ statusId?: string }>;
};

export default async function NewIssueRedirect({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { statusId } = await searchParams;
  const userFlags = await getUserFlags(session.user.id);
  const isSuperAdmin = userFlags?.isSuperAdmin ?? false;
  const projects = await getProjects(session.user.id, isSuperAdmin);

  if (projects.length === 0) redirect("/projects/new");
  const slug = projects[0].slug;
  redirect(`/${slug}/issues/new${statusId ? `?statusId=${statusId}` : ""}`);
}
