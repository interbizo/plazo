-- Add province to tenant location only. Listing filters read city/province from Tenant.
ALTER TABLE "Tenant" ADD COLUMN     "province" TEXT;

CREATE INDEX "Tenant_province_idx" ON "Tenant"("province");
