import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getIssueById, addIssueLink } from "@/lib/services/issues.service";
import { getMembership } from "@/lib/services/projects.service";
import { canEditIssue } from "@/lib/permissions";
import { getUserFlags } from "@/lib/services/users.service";
import { LinkType } from "@/app/generated/prisma/enums";

type Params = { params: Promise<{ id: string }> };

// Direction as presented in the UI — IS_BLOCKED_BY is normalised server-side
type LinkDirection = "BLOCKS" | "IS_BLOCKED_BY" | "RELATES_TO" | "DUPLICATES";

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) return NextResponse.json({ error: "Issue not found." }, { status: 404 });

  const [membership, userFlags] = await Promise.all([
    getMembership(issue.project.id, session.user.id),
    getUserFlags(session.user.id),
  ]);
  if (!canEditIssue(membership?.role ?? null, userFlags?.isSuperAdmin ?? false)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { targetIssueId, direction } = body as Record<string, unknown>;

  if (typeof targetIssueId !== "string" || typeof direction !== "string") {
    return NextResponse.json({ error: "targetIssueId and direction are required." }, { status: 400 });
  }

  const validDirections: LinkDirection[] = ["BLOCKS", "IS_BLOCKED_BY", "RELATES_TO", "DUPLICATES"];
  if (!validDirections.includes(direction as LinkDirection)) {
    return NextResponse.json({ error: "Invalid direction." }, { status: 422 });
  }

  if (targetIssueId === id) {
    return NextResponse.json({ error: "An issue cannot link to itself." }, { status: 422 });
  }

  const target = await getIssueById(targetIssueId);
  if (!target || target.project.id !== issue.project.id) {
    return NextResponse.json({ error: "Target issue not found in this project." }, { status: 422 });
  }

  // Normalise direction → (fromId, toId, LinkType)
  let fromIssueId: string;
  let toIssueId: string;
  let type: LinkType;

  if (direction === "IS_BLOCKED_BY") {
    fromIssueId = targetIssueId;
    toIssueId = id;
    type = LinkType.BLOCKS;
  } else {
    fromIssueId = id;
    toIssueId = targetIssueId;
    type = direction === "BLOCKS" ? LinkType.BLOCKS
         : direction === "RELATES_TO" ? LinkType.RELATES_TO
         : LinkType.DUPLICATES;
  }

  try {
    const link = await addIssueLink(fromIssueId, toIssueId, type);
    return NextResponse.json(link, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Link already exists." }, { status: 409 });
  }
}
