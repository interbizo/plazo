-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'UNDER_APPEAL');
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Add account status fields to User
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspendedReason" TEXT;
ALTER TABLE "User" ADD COLUMN "suspendedBy" TEXT;
ALTER TABLE "User" ADD COLUMN "gracePeriodEndsAt" TIMESTAMP(3);

-- Create AccountAppeal table
CREATE TABLE "AccountAppeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountAppeal_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "AccountAppeal_userId_idx" ON "AccountAppeal"("userId");
CREATE INDEX "AccountAppeal_status_idx" ON "AccountAppeal"("status");
CREATE INDEX "AccountAppeal_createdAt_idx" ON "AccountAppeal"("createdAt");
CREATE INDEX "User_accountStatus_idx" ON "User"("accountStatus");

-- Foreign key
ALTER TABLE "AccountAppeal" ADD CONSTRAINT "AccountAppeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
