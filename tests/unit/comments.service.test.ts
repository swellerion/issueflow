import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", async () => ({
  db: {
    issue: { findUnique: vi.fn() },
    comment: { create: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { createComment } from "@/lib/services/comments.service";

const mockIssueFindUnique = vi.mocked(db.issue.findUnique);
const mockCommentCreate = vi.mocked(db.comment.create);

beforeEach(() => vi.clearAllMocks());

describe("createComment", () => {
  it("creates a comment on a valid issue", async () => {
    mockIssueFindUnique.mockResolvedValue({ id: "issue1" } as never);
    mockCommentCreate.mockResolvedValue({
      id: "comment1",
      body: "Looks good.",
      issueId: "issue1",
      authorId: "user1",
      createdAt: new Date(),
      author: { id: "user1", username: "alice" },
    } as never);

    const result = await createComment({
      body: "Looks good.",
      issueId: "issue1",
      authorId: "user1",
    });

    expect(result.body).toBe("Looks good.");
    expect(mockCommentCreate).toHaveBeenCalledOnce();
  });

  it("rejects empty body", async () => {
    await expect(
      createComment({ body: "  ", issueId: "issue1", authorId: "user1" })
    ).rejects.toThrow("Comment body is required.");
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });

  it("rejects comment on non-existent issue", async () => {
    mockIssueFindUnique.mockResolvedValue(null);

    await expect(
      createComment({ body: "Hello", issueId: "ghost", authorId: "user1" })
    ).rejects.toThrow("Issue not found.");
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });
});
