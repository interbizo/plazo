-- Add optional proposal cap for buyer job postings
ALTER TABLE "Job"
ADD COLUMN "maxProposals" INTEGER;

CREATE INDEX "Job_maxProposals_idx" ON "Job"("maxProposals");
