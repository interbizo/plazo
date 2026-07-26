-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "lastVerificationEmailSentAt" TIMESTAMP(3);

-- Add index for email verification tracking
CREATE INDEX "User_isEmailVerified_idx" ON "User"("isEmailVerified");
CREATE INDEX "User_verificationToken_idx" ON "User"("verificationToken");
