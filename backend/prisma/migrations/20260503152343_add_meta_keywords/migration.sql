-- AlterTable Product: Add metaKeywords
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;

-- AlterTable Service: Add metaKeywords
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;
