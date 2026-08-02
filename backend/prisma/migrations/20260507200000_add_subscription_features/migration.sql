-- AlterTable: Add new subscription feature flags
ALTER TABLE "SubscriptionPlanConfig" 
ADD COLUMN IF NOT EXISTS "canSubmitProposal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "canWhatsappCheckout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "canToolsRecommendation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "canBecomeAffiliate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "canRequestPhysicalVerification" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "canBoostListing" BOOLEAN NOT NULL DEFAULT false;

-- Update existing plans with default feature configurations
-- FREE Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = false,
  "canWhatsappCheckout" = false,
  "canToolsRecommendation" = false,
  "canBecomeAffiliate" = false,
  "canBoostListing" = false
WHERE "plan" = 'FREE';

-- BASIC Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = false,
  "canBecomeAffiliate" = false,
  "canBoostListing" = false
WHERE "plan" = 'BASIC';

-- PREMIUM Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true,
  "canVerifiedBadge" = true,
  "canFlashSale" = true
WHERE "plan" = 'PREMIUM';

-- PROFESSIONAL Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true,
  "canVerifiedBadge" = true,
  "canFeaturedStore" = true,
  "canFlashSale" = true,
  "canRequestPhysicalVerification" = true
WHERE "plan" = 'PROFESSIONAL';

-- ENTERPRISE Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true,
  "canVerifiedBadge" = true,
  "canFeaturedStore" = true,
  "canFlashSale" = true,
  "canRequestPhysicalVerification" = true,
  "canPublishToMarketplace" = true
WHERE "plan" = 'ENTERPRISE';

-- ULTIMATE Plan
UPDATE "SubscriptionPlanConfig" 
SET 
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true,
  "canVerifiedBadge" = true,
  "canFeaturedStore" = true,
  "canFlashSale" = true,
  "canRequestPhysicalVerification" = true,
  "canPublishToMarketplace" = true,
  "canAdvancedAnalytics" = true,
  "canCustomTheme" = true,
  "canRemoveBranding" = true
WHERE "plan" = 'ULTIMATE';
