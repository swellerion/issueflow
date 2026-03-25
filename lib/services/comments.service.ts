import { db } from "@/lib/db";
import { isRichTextEmpty } from "@/lib/rich-text";

export async function createComment(input: {
  body: string;
  issueId: string;
  authorId: string;
}) {
  const body = input.body.trim();
  if (body.length < 1 || isRichTextEmpty(body)) {
    throw new Error("Comment body is required.");
  }
  if (body.length > 10000) {
    throw new Error("Comment must be 10,000 characters or fewer.");
  }

  const issue = await db.issue.findUnique({
    where: { id: input.issueId },
    select: { id: true },
  });
  if (!issue) throw new Error("Issue not found.");

  return db.comment.create({
    data: { body, issueId: input.issueId, authorId: input.authorId },
    include: { author: { select: { id: true, username: true } } },
  });
}

export async function deleteComment(commentId: string, requestingUserId: string): Promise<void> {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, issueId: true },
  });
  if (!comment) throw new Error("Comment not found.");
  if (comment.authorId !== requestingUserId) {
    throw new Error("Forbidden.");
  }
  await db.comment.delete({ where: { id: commentId } });
}
