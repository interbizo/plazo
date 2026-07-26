-- Migration: add_subscription_fields_and_tools
-- Adds: Subscription extra fields, RecommendedTool table, OrderMilestone extra fields, Withdrawal extra fields

-- ============================================
-- CREATE ENUM
-- ============================================

DO $$ BEGIN
  CREATE TYPE "RecommendedToolType" AS ENUM ('EBOOK_PDF', 'APPLICATION', 'WEBSITE', 'TOOLS_ONLINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- ALTER TABLES (safe with IF NOT EXISTS)
-- ============================================

-- Subscription: add missing fields
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "isTrialActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "nextBillingDate" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

-- OrderMilestone: add missing fields
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "attachments" TEXT[];
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "deliverables" TEXT[];
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "isApproved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderMilestone" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

-- Withdrawal: add missing fields
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "accountName" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
ALTER TABLE "Withdrawal" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;

-- ============================================
-- CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS "RecommendedTool" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "RecommendedToolType" NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "redirectUrl" TEXT,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendedTool_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREATE INDEXES (safe with IF NOT EXISTS)
-- ============================================

CREATE INDEX IF NOT EXISTS "RecommendedTool_isActive_idx" ON "RecommendedTool"("isActive");
CREATE INDEX IF NOT EXISTS "RecommendedTool_type_idx" ON "RecommendedTool"("type");
CREATE INDEX IF NOT EXISTS "RecommendedTool_sortOrder_idx" ON "RecommendedTool"("sortOrder");

CREATE INDEX IF NOT EXISTS "OrderMilestone_status_idx" ON "OrderMilestone"("status");
CREATE INDEX IF NOT EXISTS "OrderMilestone_isCompleted_idx" ON "OrderMilestone"("isCompleted");
CREATE INDEX IF NOT EXISTS "OrderMilestone_isPaid_idx" ON "OrderMilestone"("isPaid");
CREATE INDEX IF NOT EXISTS "OrderMilestone_orderId_sortOrder_idx" ON "OrderMilestone"("orderId", "sortOrder");

CREATE INDEX IF NOT EXISTS "Subscription_isActive_idx" ON "Subscription"("isActive");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_renewalDate_idx" ON "Subscription"("renewalDate");
CREATE INDEX IF NOT EXISTS "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

CREATE INDEX IF NOT EXISTS "Withdrawal_userId_status_idx" ON "Withdrawal"("userId", "status");
CREATE INDEX IF NOT EXISTS "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");
