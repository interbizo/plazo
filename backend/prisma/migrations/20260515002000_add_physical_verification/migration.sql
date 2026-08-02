-- Add physical verification request tracking for tenants.
CREATE TYPE "PhysicalVerificationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'SCHEDULED', 'IN_PROGRESS', 'APPROVED', 'REJECTED');

CREATE TABLE "PhysicalVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestNotes" TEXT,
    "businessName" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "businessCity" TEXT,
    "businessPhone" TEXT,
    "status" "PhysicalVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledDate" TIMESTAMP(3),
    "visitedDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "certificateUrl" TEXT,
    "certificateUploadedAt" TIMESTAMP(3),
    "certificateUploadedBy" TEXT,
    "visitPhotos" TEXT[] NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhysicalVerification_tenantId_key" ON "PhysicalVerification"("tenantId");
CREATE INDEX "PhysicalVerification_tenantId_idx" ON "PhysicalVerification"("tenantId");
CREATE INDEX "PhysicalVerification_status_idx" ON "PhysicalVerification"("status");
CREATE INDEX "PhysicalVerification_requestedBy_idx" ON "PhysicalVerification"("requestedBy");
CREATE INDEX "PhysicalVerification_scheduledDate_idx" ON "PhysicalVerification"("scheduledDate");

ALTER TABLE "PhysicalVerification" ADD CONSTRAINT "PhysicalVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
