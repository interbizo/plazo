/*
  Warnings:

  - The values [RESOLVED_BUYER,RESOLVED_SELLER] on the enum `DisputeStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DisputeStatus_new" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED_BUYER_WIN', 'RESOLVED_SELLER_WIN', 'RESOLVED_PARTIAL', 'CLOSED', 'CANCELLED');
ALTER TABLE "Dispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Dispute" ALTER COLUMN "status" TYPE "DisputeStatus_new" USING ("status"::text::"DisputeStatus_new");
ALTER TYPE "DisputeStatus" RENAME TO "DisputeStatus_old";
ALTER TYPE "DisputeStatus_new" RENAME TO "DisputeStatus";
DROP TYPE "DisputeStatus_old";
ALTER TABLE "Dispute" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "adminId" TEXT,
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "decision" TEXT;
