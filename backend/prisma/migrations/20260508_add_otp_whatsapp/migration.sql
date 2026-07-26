-- Add OTP model for WhatsApp verification
CREATE TYPE "OTPType" AS ENUM ('REGISTRATION', 'FORGOT_PASSWORD', 'LOGIN_2FA');

CREATE TABLE "OTP" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "OTPType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTP_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "OTP_phone_idx" ON "OTP"("phone");
CREATE INDEX "OTP_userId_idx" ON "OTP"("userId");
CREATE INDEX "OTP_type_idx" ON "OTP"("type");
CREATE INDEX "OTP_expiresAt_idx" ON "OTP"("expiresAt");
CREATE INDEX "OTP_isUsed_idx" ON "OTP"("isUsed");

-- Add foreign key if userId exists
ALTER TABLE "OTP" ADD CONSTRAINT "OTP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add isPhoneVerified to User model
ALTER TABLE "User" ADD COLUMN "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
