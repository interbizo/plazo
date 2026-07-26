-- Update subscription plan configs to add missing feature flags
-- This script adds the new subscription features to existing plans

-- Update FREE plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = false,
  "canSubmitProposal" = false,
  "canWhatsappCheckout" = false,
  "canToolsRecommendation" = false,
  "canBecomeAffiliate" = false,
  "canBoostListing" = false
WHERE "plan" = 'FREE';

-- Update BASIC plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = true,
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = false
WHERE "plan" = 'BASIC';

-- Update PREMIUM plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = true,
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true
WHERE "plan" = 'PREMIUM';

-- Update PROFESSIONAL plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = true,
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true
WHERE "plan" = 'PROFESSIONAL';

-- Update ENTERPRISE plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = true,
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true
WHERE "plan" = 'ENTERPRISE';

-- Update ULTIMATE plan
UPDATE "SubscriptionPlanConfig"
SET 
  "canRequestPhysicalVerification" = true,
  "canSubmitProposal" = true,
  "canWhatsappCheckout" = true,
  "canToolsRecommendation" = true,
  "canBecomeAffiliate" = true,
  "canBoostListing" = true
WHERE "plan" = 'ULTIMATE';

-- Verify the updates
SELECT "plan", "canBoostListing", "canRequestPhysicalVerification", "canSubmitProposal", 
       "canWhatsappCheckout", "canToolsRecommendation", "canBecomeAffiliate"
FROM "SubscriptionPlanConfig"
ORDER BY "sortOrder";
