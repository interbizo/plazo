-- Add product type and digital product fields
-- Migration: add_digital_product_support

-- Add enum for product type
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- Add new columns to Product table
ALTER TABLE "Product" ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'PHYSICAL';
ALTER TABLE "Product" ADD COLUMN "isDigital" BOOLEAN NOT NULL DEFAULT false;

-- Digital Product Fields
ALTER TABLE "Product" ADD COLUMN "digitalFileUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "digitalFileSize" INTEGER;
ALTER TABLE "Product" ADD COLUMN "digitalFileName" TEXT;
ALTER TABLE "Product" ADD COLUMN "downloadLimit" INTEGER;
ALTER TABLE "Product" ADD COLUMN "downloadExpiry" INTEGER; -- in days
ALTER TABLE "Product" ADD COLUMN "externalLink" TEXT;
ALTER TABLE "Product" ADD COLUMN "accessInstructions" TEXT;
ALTER TABLE "Product" ADD COLUMN "licenseKey" TEXT;
ALTER TABLE "Product" ADD COLUMN "digitalDeliveryMethod" TEXT; -- 'FILE_DOWNLOAD', 'EXTERNAL_LINK', 'LICENSE_KEY', 'GOOGLE_DRIVE', 'MANUAL'

-- Add index for digital products
CREATE INDEX "Product_productType_idx" ON "Product"("productType");
CREATE INDEX "Product_isDigital_idx" ON "Product"("isDigital");

-- Update existing products to be PHYSICAL type
UPDATE "Product" SET "productType" = 'PHYSICAL', "isDigital" = false WHERE "productType" IS NULL;
