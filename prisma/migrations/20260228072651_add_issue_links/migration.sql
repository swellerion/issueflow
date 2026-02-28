-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('BLOCKS', 'RELATES_TO', 'DUPLICATES');

-- CreateTable
CREATE TABLE "IssueLink" (
    "id" TEXT NOT NULL,
    "fromIssueId" TEXT NOT NULL,
    "toIssueId" TEXT NOT NULL,
    "type" "LinkType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IssueLink_toIssueId_idx" ON "IssueLink"("toIssueId");

-- CreateIndex
CREATE UNIQUE INDEX "IssueLink_fromIssueId_toIssueId_type_key" ON "IssueLink"("fromIssueId", "toIssueId", "type");

-- AddForeignKey
ALTER TABLE "IssueLink" ADD CONSTRAINT "IssueLink_fromIssueId_fkey" FOREIGN KEY ("fromIssueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueLink" ADD CONSTRAINT "IssueLink_toIssueId_fkey" FOREIGN KEY ("toIssueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
