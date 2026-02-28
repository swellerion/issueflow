-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "issueTypeId" TEXT;

-- CreateTable
CREATE TABLE "IssueType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'circle-dot',
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "position" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "IssueType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IssueType_projectId_position_key" ON "IssueType"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "IssueType_projectId_name_key" ON "IssueType"("projectId", "name");

-- AddForeignKey
ALTER TABLE "IssueType" ADD CONSTRAINT "IssueType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_issueTypeId_fkey" FOREIGN KEY ("issueTypeId") REFERENCES "IssueType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
