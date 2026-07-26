-- Update subscription plan configs to enable physical verification for PROFESSIONAL, ENTERPRISE, and ULTIMATE
UPDATE "SubscriptionPlanConfig" 
SET "canRequestPhysicalVerification" = true 
WHERE plan IN ('PROFESSIONAL', 'ENTERPRISE', 'ULTIMATE');
