/*
  Warnings:

  - You are about to drop the column `canCustomDomain` on the `SubscriptionPlanConfig` table. All the data in the column will be lost.
  - You are about to drop the column `canCustomDomainUse` on the `Tenant` table. All the data in the column will be lost.
  - You are about to drop the column `customDomain` on the `Tenant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Tenant_customDomain_idx";

-- DropIndex
DROP INDEX "Tenant_customDomain_key";

-- AlterTable
ALTER TABLE "SubscriptionPlanConfig" DROP COLUMN "canCustomDomain";

-- AlterTable
ALTER TABLE "Tenant" DROP COLUMN "canCustomDomainUse",
DROP COLUMN "customDomain",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "contactWhatsapp" TEXT,
ADD COLUMN     "favicon" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "pinnedProductIds" TEXT[],
ADD COLUMN     "pinnedServiceIds" TEXT[],
ADD COLUMN     "privacyPolicy" TEXT,
ADD COLUMN     "returnPolicy" TEXT,
ADD COLUMN     "shippingPolicy" TEXT,
ADD COLUMN     "storeHours" JSONB,
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "termsOfService" TEXT,
ADD COLUMN     "themeSecondary" TEXT;

-- CreateTable
CREATE TABLE "StorePage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StorePage_tenantId_idx" ON "StorePage"("tenantId");

-- CreateIndex
CREATE INDEX "StorePage_tenantId_isPublished_idx" ON "StorePage"("tenantId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "StorePage_tenantId_slug_key" ON "StorePage"("tenantId", "slug");

-- AddForeignKey
ALTER TABLE "StorePage" ADD CONSTRAINT "StorePage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
