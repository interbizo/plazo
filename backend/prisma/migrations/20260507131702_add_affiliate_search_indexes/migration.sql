-- Add affiliate and referral foundations
CREATE TYPE "AffiliateType" AS ENUM ('GENERAL', 'CITY_SPECIAL');
CREATE TYPE "AffiliateBonusStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');
CREATE TYPE "AffiliateClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

ALTER TABLE "Tenant"
ADD COLUMN "referralCodeUsed" TEXT,
ADD COLUMN "referredBy" TEXT;

ALTER TABLE "SubscriptionPayment"
ADD COLUMN "referralCodeUsed" TEXT,
ADD COLUMN "affiliateUserId" TEXT,
ADD COLUMN "affiliateType" "AffiliateType",
ADD COLUMN "affiliateRate" DOUBLE PRECISION;

CREATE TABLE "AffiliateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCitySpecial" BOOLEAN NOT NULL DEFAULT false,
    "city" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateClaim" (
    "id" TEXT NOT NULL,
    "affiliateUserId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "AffiliateClaimStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffiliateBonus" (
    "id" TEXT NOT NULL,
    "affiliateUserId" TEXT NOT NULL,
    "referredTenantId" TEXT NOT NULL,
    "subscriptionPaymentId" TEXT NOT NULL,
    "claimId" TEXT,
    "affiliateType" "AffiliateType" NOT NULL,
    "citySnapshot" TEXT,
    "rate" DOUBLE PRECISION NOT NULL,
    "subscriptionAmount" DOUBLE PRECISION NOT NULL,
    "bonusAmount" DOUBLE PRECISION NOT NULL,
    "status" "AffiliateBonusStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateBonus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffiliateProfile_userId_key" ON "AffiliateProfile"("userId");
CREATE UNIQUE INDEX "AffiliateProfile_referralCode_key" ON "AffiliateProfile"("referralCode");
CREATE INDEX "AffiliateProfile_isActive_idx" ON "AffiliateProfile"("isActive");
CREATE INDEX "AffiliateProfile_isCitySpecial_idx" ON "AffiliateProfile"("isCitySpecial");
CREATE INDEX "AffiliateProfile_city_idx" ON "AffiliateProfile"("city");
CREATE INDEX "AffiliateClaim_affiliateUserId_idx" ON "AffiliateClaim"("affiliateUserId");
CREATE INDEX "AffiliateClaim_status_idx" ON "AffiliateClaim"("status");
CREATE INDEX "AffiliateClaim_requestedAt_idx" ON "AffiliateClaim"("requestedAt");
CREATE UNIQUE INDEX "AffiliateBonus_subscriptionPaymentId_key" ON "AffiliateBonus"("subscriptionPaymentId");
CREATE UNIQUE INDEX "AffiliateBonus_affiliateUserId_referredTenantId_subscriptio_key" ON "AffiliateBonus"("affiliateUserId", "referredTenantId", "subscriptionPaymentId");
CREATE INDEX "AffiliateBonus_affiliateUserId_idx" ON "AffiliateBonus"("affiliateUserId");
CREATE INDEX "AffiliateBonus_referredTenantId_idx" ON "AffiliateBonus"("referredTenantId");
CREATE INDEX "AffiliateBonus_claimId_idx" ON "AffiliateBonus"("claimId");
CREATE INDEX "AffiliateBonus_status_idx" ON "AffiliateBonus"("status");
CREATE INDEX "SubscriptionPayment_affiliateUserId_idx" ON "SubscriptionPayment"("affiliateUserId");

ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliateProfile" ADD CONSTRAINT "AffiliateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateClaim" ADD CONSTRAINT "AffiliateClaim_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateBonus" ADD CONSTRAINT "AffiliateBonus_affiliateUserId_fkey" FOREIGN KEY ("affiliateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateBonus" ADD CONSTRAINT "AffiliateBonus_referredTenantId_fkey" FOREIGN KEY ("referredTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateBonus" ADD CONSTRAINT "AffiliateBonus_subscriptionPaymentId_fkey" FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AffiliateBonus" ADD CONSTRAINT "AffiliateBonus_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "AffiliateClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for optimized affiliate search performance

-- User table indexes for name search
CREATE INDEX IF NOT EXISTS "User_firstName_idx" ON "User"("firstName");
CREATE INDEX IF NOT EXISTS "User_lastName_idx" ON "User"("lastName");

-- Tenant table indexes for affiliate search
CREATE INDEX IF NOT EXISTS "Tenant_name_idx" ON "Tenant"("name");
CREATE INDEX IF NOT EXISTS "Tenant_referredBy_idx" ON "Tenant"("referredBy");
CREATE INDEX IF NOT EXISTS "Tenant_referredBy_deletedAt_idx" ON "Tenant"("referredBy", "deletedAt");
CREATE INDEX IF NOT EXISTS "Tenant_referredBy_createdAt_idx" ON "Tenant"("referredBy", "createdAt");

-- These indexes will significantly improve search performance when:
-- 1. Searching by user first name or last name
-- 2. Searching by tenant name
-- 3. Filtering tenants by referredBy with deletedAt check
-- 4. Sorting tenants by createdAt within a referredBy group
