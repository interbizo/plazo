-- AlterTable
ALTER TABLE "CmsBanner" ADD COLUMN "isFallback" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "CmsBanner_isFallback_idx" ON "CmsBanner"("isFallback");
