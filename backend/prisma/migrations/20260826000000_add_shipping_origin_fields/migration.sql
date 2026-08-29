ALTER TABLE "Tenant" ADD COLUMN "shippingOriginId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "shippingOriginLabel" TEXT;
ALTER TABLE "Product" ADD COLUMN "weightGram" INTEGER NOT NULL DEFAULT 1000;

CREATE INDEX "Tenant_shippingOriginId_idx" ON "Tenant"("shippingOriginId");