-- Add indexes for optimized affiliate search performance

-- User table indexes for name search
CREATE INDEX IF NOT EXISTS "User_firstName_idx" ON "User"("firstName");
CREATE INDEX IF NOT EXISTS "User_lastName_idx" ON "User"("lastName");

-- Tenant table indexes for affiliate search
CREATE INDEX IF NOT EXISTS "Tenant_name_idx" ON "Tenant"("name");
CREATE INDEX IF NOT EXISTS "Tenant_referredBy_deletedAt_idx" ON "Tenant"("referredBy", "deletedAt");
CREATE INDEX IF NOT EXISTS "Tenant_referredBy_createdAt_idx" ON "Tenant"("referredBy", "createdAt");

-- These indexes will significantly improve search performance when:
-- 1. Searching by user first name or last name
-- 2. Searching by tenant name
-- 3. Filtering tenants by referredBy with deletedAt check
-- 4. Sorting tenants by createdAt within a referredBy group
