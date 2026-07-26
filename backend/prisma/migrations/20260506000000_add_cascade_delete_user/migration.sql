-- Add CASCADE DELETE for user-related tables to prevent orphan data

-- Drop existing foreign key constraints and recreate with CASCADE
ALTER TABLE "Tenant" DROP CONSTRAINT IF EXISTS "Tenant_ownerId_fkey";
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_ownerId_fkey" 
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SellerProfile" DROP CONSTRAINT IF EXISTS "SellerProfile_userId_fkey";
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KycSubmission" DROP CONSTRAINT IF EXISTS "KycSubmission_userId_fkey";
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: AffiliateProfile already has CASCADE in schema
-- RefreshToken already has CASCADE in schema

-- Add comments for documentation
COMMENT ON CONSTRAINT "Tenant_ownerId_fkey" ON "Tenant" IS 
  'Cascade delete: When user is deleted, all their tenants (stores) are also deleted';

COMMENT ON CONSTRAINT "SellerProfile_userId_fkey" ON "SellerProfile" IS 
  'Cascade delete: When user is deleted, their seller profile is also deleted';

COMMENT ON CONSTRAINT "KycSubmission_userId_fkey" ON "KycSubmission" IS 
  'Cascade delete: When user is deleted, their KYC submission is also deleted';
