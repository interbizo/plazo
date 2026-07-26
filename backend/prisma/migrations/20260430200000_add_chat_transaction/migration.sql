-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ChatTransactionStatus" AS ENUM ('ONGOING', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChatTransaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "contextTitle" TEXT NOT NULL,
    "variantName" TEXT,
    "quantity" INTEGER,
    "packageTier" TEXT,
    "packageTitle" TEXT,
    "price" DOUBLE PRECISION,
    "status" "ChatTransactionStatus" NOT NULL DEFAULT 'ONGOING',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "reviewId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ChatTransaction_reviewId_key" ON "ChatTransaction"("reviewId");
CREATE INDEX IF NOT EXISTS "ChatTransaction_roomId_idx" ON "ChatTransaction"("roomId");
CREATE INDEX IF NOT EXISTS "ChatTransaction_buyerId_idx" ON "ChatTransaction"("buyerId");
CREATE INDEX IF NOT EXISTS "ChatTransaction_sellerId_idx" ON "ChatTransaction"("sellerId");
CREATE INDEX IF NOT EXISTS "ChatTransaction_tenantId_idx" ON "ChatTransaction"("tenantId");
CREATE INDEX IF NOT EXISTS "ChatTransaction_status_idx" ON "ChatTransaction"("status");
CREATE INDEX IF NOT EXISTS "ChatTransaction_contextType_contextId_idx" ON "ChatTransaction"("contextType", "contextId");

-- AddForeignKey
ALTER TABLE "ChatTransaction" ADD CONSTRAINT "ChatTransaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatTransaction" ADD CONSTRAINT "ChatTransaction_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE SET NULL ON UPDATE CASCADE;
