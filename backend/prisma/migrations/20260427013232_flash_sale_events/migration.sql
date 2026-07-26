-- DropIndex
DROP INDEX "FlashSaleItem_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "FlashSaleItem" ADD COLUMN     "eventId" TEXT,
ALTER COLUMN "startDate" DROP NOT NULL,
ALTER COLUMN "endDate" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FlashSaleEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashSaleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashSaleEvent_isActive_startDate_endDate_idx" ON "FlashSaleEvent"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "FlashSaleItem_eventId_idx" ON "FlashSaleItem"("eventId");

-- AddForeignKey
ALTER TABLE "FlashSaleItem" ADD CONSTRAINT "FlashSaleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "FlashSaleEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
