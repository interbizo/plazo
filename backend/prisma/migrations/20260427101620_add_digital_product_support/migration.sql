-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "accessInstructions" TEXT,
ADD COLUMN     "digitalDeliveryMethod" TEXT,
ADD COLUMN     "digitalFileName" TEXT,
ADD COLUMN     "digitalFileSize" INTEGER,
ADD COLUMN     "digitalFileUrl" TEXT,
ADD COLUMN     "downloadExpiry" INTEGER,
ADD COLUMN     "downloadLimit" INTEGER,
ADD COLUMN     "externalLink" TEXT,
ADD COLUMN     "isDigital" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "licenseKey" TEXT,
ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'PHYSICAL';

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE INDEX "Product_isDigital_idx" ON "Product"("isDigital");
