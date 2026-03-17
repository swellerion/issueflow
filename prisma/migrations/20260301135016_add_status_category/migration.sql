-- CreateEnum
CREATE TYPE "StatusCategory" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "category" "StatusCategory" NOT NULL DEFAULT 'TODO';

-- AlterTable
ALTER TABLE "WorkflowState" ADD COLUMN     "category" "StatusCategory" NOT NULL DEFAULT 'TODO';
