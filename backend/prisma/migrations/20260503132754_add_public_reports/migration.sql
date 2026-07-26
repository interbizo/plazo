-- AlterTable
ALTER TABLE "Report" 
  ALTER COLUMN "reporterId" DROP NOT NULL,
  ADD COLUMN "metadata" JSONB;
