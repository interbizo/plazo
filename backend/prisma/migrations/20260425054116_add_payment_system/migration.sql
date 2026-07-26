/*
  Warnings:

  - A unique constraint covering the columns `[paymentCode]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'E_WALLET', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_UPLOADED';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_VERIFIED';
ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "OrderStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Category" ALTER COLUMN "type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "KycSubmission" ALTER COLUMN "selfiePath" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "autoExpireAt" TIMESTAMP(3),
ADD COLUMN     "escrowHeldAt" TIMESTAMP(3),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentCode" TEXT,
ADD COLUMN     "paymentDeadline" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "transactionDate" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "status" "PaymentProofStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "rejectionReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "type" "PaymentMethod" NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "walletType" TEXT,
    "phoneNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentVerificationLog" (
    "id" TEXT NOT NULL,
    "paymentProofId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProof_orderId_key" ON "PaymentProof"("orderId");

-- CreateIndex
CREATE INDEX "PaymentProof_status_idx" ON "PaymentProof"("status");

-- CreateIndex
CREATE INDEX "PaymentProof_uploadedAt_idx" ON "PaymentProof"("uploadedAt");

-- CreateIndex
CREATE INDEX "PaymentProof_uploadedBy_idx" ON "PaymentProof"("uploadedBy");

-- CreateIndex
CREATE INDEX "PaymentProof_verifiedBy_idx" ON "PaymentProof"("verifiedBy");

-- CreateIndex
CREATE INDEX "PaymentAccount_tenantId_idx" ON "PaymentAccount"("tenantId");

-- CreateIndex
CREATE INDEX "PaymentAccount_isActive_isPrimary_idx" ON "PaymentAccount"("isActive", "isPrimary");

-- CreateIndex
CREATE INDEX "PaymentVerificationLog_paymentProofId_idx" ON "PaymentVerificationLog"("paymentProofId");

-- CreateIndex
CREATE INDEX "PaymentVerificationLog_performedBy_idx" ON "PaymentVerificationLog"("performedBy");

-- CreateIndex
CREATE INDEX "PaymentVerificationLog_createdAt_idx" ON "PaymentVerificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentCode_key" ON "Order"("paymentCode");

-- CreateIndex
CREATE INDEX "Order_paymentCode_idx" ON "Order"("paymentCode");

-- CreateIndex
CREATE INDEX "Order_paymentDeadline_idx" ON "Order"("paymentDeadline");

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAccount" ADD CONSTRAINT "PaymentAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentVerificationLog" ADD CONSTRAINT "PaymentVerificationLog_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
