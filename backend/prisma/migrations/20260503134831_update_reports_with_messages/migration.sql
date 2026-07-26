-- Delete any reports with NULL reporterId first
DELETE FROM "Report" WHERE "reporterId" IS NULL;

-- AlterTable Report: make reporterId required and remove metadata
ALTER TABLE "Report" 
  ALTER COLUMN "reporterId" SET NOT NULL,
  DROP COLUMN IF EXISTS "metadata";

-- CreateTable ReportMessage
CREATE TABLE IF NOT EXISTS "ReportMessage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportMessage_reportId_idx" ON "ReportMessage"("reportId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportMessage_senderId_idx" ON "ReportMessage"("senderId");

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ReportMessage_reportId_fkey'
    ) THEN
        ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_reportId_fkey" 
        FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ReportMessage_senderId_fkey'
    ) THEN
        ALTER TABLE "ReportMessage" ADD CONSTRAINT "ReportMessage_senderId_fkey" 
        FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
