-- CreateEnum
CREATE TYPE "StoreDisplayMode" AS ENUM ('LANDING_PAGE', 'CATALOG');

-- CreateEnum
CREATE TYPE "SellerTier" AS ENUM ('FREE', 'MEMBER');

-- AlterEnum (SubscriptionPlan: add BASIC, PROFESSIONAL, ENTERPRISE; remove PREMIUM, ULTIMATE)
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'BASIC';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'ENTERPRISE';

-- AlterTable: Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "publishToMarketplace" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Service
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "publishToMarketplace" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "sellerTier" "SellerTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "displayMode" "StoreDisplayMode" NOT NULL DEFAULT 'CATALOG';
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "canHighlightProducts" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "canPriorityListing" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "canCustomDomainUse" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "canAnalyticsAdvanced" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastPaymentAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "lastPaymentAmount" DOUBLE PRECISION;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "failedPayments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "previousPlan" "SubscriptionPlan";
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "upgradedAt" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "downgradedAt" TIMESTAMP(3);

-- CreateTable: SubscriptionHistory
CREATE TABLE IF NOT EXISTS "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromPlan" "SubscriptionPlan" NOT NULL,
    "toPlan" "SubscriptionPlan" NOT NULL,
    "fromTier" "SellerTier" NOT NULL,
    "toTier" "SellerTier" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Product_publishToMarketplace_idx" ON "Product"("publishToMarketplace");
CREATE INDEX IF NOT EXISTS "Service_publishToMarketplace_idx" ON "Service"("publishToMarketplace");
CREATE INDEX IF NOT EXISTS "SubscriptionHistory_tenantId_idx" ON "SubscriptionHistory"("tenantId");
