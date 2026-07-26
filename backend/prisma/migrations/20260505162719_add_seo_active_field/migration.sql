-- AlterTable: Add SEO control fields to Tenant table
-- This migration adds fields to control search engine indexing for store pages

-- Add isSeoActive field (default: false for safety)
ALTER TABLE "Tenant" ADD COLUMN "isSeoActive" BOOLEAN NOT NULL DEFAULT false;

-- Add seoActivatedAt field (timestamp when SEO was enabled)
ALTER TABLE "Tenant" ADD COLUMN "seoActivatedAt" TIMESTAMP(3);

-- Add seoDeactivatedAt field (timestamp when SEO was disabled, for tracking)
ALTER TABLE "Tenant" ADD COLUMN "seoDeactivatedAt" TIMESTAMP(3);

-- Add index for faster queries on isSeoActive
CREATE INDEX "Tenant_isSeoActive_idx" ON "Tenant"("isSeoActive");

-- Add comment for documentation
COMMENT ON COLUMN "Tenant"."isSeoActive" IS 'Controls whether this store can be indexed by search engines. Default: false (noindex). Only premium + verified stores can enable this.';
COMMENT ON COLUMN "Tenant"."seoActivatedAt" IS 'Timestamp when SEO indexing was activated for this store';
COMMENT ON COLUMN "Tenant"."seoDeactivatedAt" IS 'Timestamp when SEO indexing was deactivated (for audit trail)';
