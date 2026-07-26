-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('EMAIL', 'WHATSAPP', 'NONE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "verificationMethod" "VerificationMethod" NOT NULL DEFAULT 'NONE';

-- Update existing users based on their verification status
-- If phoneVerifiedAt exists, set to WHATSAPP
UPDATE "User" 
SET "verificationMethod" = 'WHATSAPP' 
WHERE "phoneVerifiedAt" IS NOT NULL;

-- If emailVerifiedAt exists and verificationMethod is still NONE, set to EMAIL
UPDATE "User" 
SET "verificationMethod" = 'EMAIL' 
WHERE "emailVerifiedAt" IS NOT NULL AND "verificationMethod" = 'NONE';
