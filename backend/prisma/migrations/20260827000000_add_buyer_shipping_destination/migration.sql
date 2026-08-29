ALTER TABLE "User" ADD COLUMN "shippingDestinationId" TEXT;
ALTER TABLE "User" ADD COLUMN "shippingDestinationLabel" TEXT;

CREATE INDEX "User_shippingDestinationId_idx" ON "User"("shippingDestinationId");