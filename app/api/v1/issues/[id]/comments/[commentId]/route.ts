import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserFlags } from "@/lib/services/users.service";
import { getMembership } from "@/lib/services/projects.service";
import { getIssueById } from "@/lib/services/issues.service";
import { canDeleteComment } from "@/lib/permissions";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string; commentId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id: issueId, commentId } = await params;

  const [comment, issue] = await Promise.all([
    db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, issueId: true },
    }),
    getIssueById(issueId),
  ]);

  if (!comment || comment.issueId !== issueId || !issue) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const [membership, userFlags] = await Promise.all([
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);

  if (
    !canDeleteComment(
      comment.authorId,
      session.user.id,
      membership?.role ?? null,
      userFlags?.isSuperAdmin ?? false
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await db.comment.delete({ where: { id: commentId } });
  return new NextResponse(null, { status: 204 });
}
