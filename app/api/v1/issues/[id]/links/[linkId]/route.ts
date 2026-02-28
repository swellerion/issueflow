import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIssueById, deleteIssueLink } from "@/lib/services/issues.service";
import { getMembership } from "@/lib/services/projects.service";
import { canEditIssue } from "@/lib/permissions";
import { getUserFlags } from "@/lib/services/users.service";

type Params = { params: Promise<{ id: string; linkId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id, linkId } = await params;
  const issue = await getIssueById(id);
  if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

  const [membership, userFlags] = await Promise.all([
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canEditIssue(membership?.role ?? null, userFlags?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Verify the link belongs to this issue (either side)
  const link = [
    ...issue.linksFrom,
    ...issue.linksTo,
  ].find((l) => l.id === linkId);

  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  await deleteIssueLink(linkId);
  return new NextResponse(null, { status: 204 });
}
