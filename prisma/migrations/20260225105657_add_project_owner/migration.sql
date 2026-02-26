-- Clear stale test data so the NOT NULL column can be added cleanly.
-- All rows are from previous development/test runs (no production data).
TRUNCATE TABLE "Project" CASCADE;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ownerId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
