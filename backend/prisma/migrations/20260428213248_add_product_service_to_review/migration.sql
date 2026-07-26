-- AlterTable
ALTER TABLE "Review" ADD COLUMN "productId" TEXT,
ADD COLUMN "serviceId" TEXT;

-- CreateIndex
CREATE INDEX "Review_productId_idx" ON "Review"("productId");

-- CreateIndex
CREATE INDEX "Review_serviceId_idx" ON "Review"("serviceId");

-- CreateIndex
CREATE INDEX "Review_productId_rating_idx" ON "Review"("productId", "rating");

-- CreateIndex
CREATE INDEX "Review_serviceId_rating_idx" ON "Review"("serviceId", "rating");

-- DropIndex
DROP INDEX IF EXISTS "Review_orderId_giverId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderId_giverId_productId_serviceId_key" ON "Review"("orderId", "giverId", "productId", "serviceId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
