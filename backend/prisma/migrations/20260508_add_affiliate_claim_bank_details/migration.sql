-- Add bank account details to AffiliateClaim
ALTER TABLE "AffiliateClaim" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "AffiliateClaim" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "AffiliateClaim" ADD COLUMN "bankName" TEXT;
ALTER TABLE "AffiliateClaim" ADD COLUMN "paymentProofUrl" TEXT;

-- Add bank account details to AffiliateProfile for reuse
ALTER TABLE "AffiliateProfile" ADD COLUMN "defaultBankAccountName" TEXT;
ALTER TABLE "AffiliateProfile" ADD COLUMN "defaultBankAccountNumber" TEXT;
ALTER TABLE "AffiliateProfile" ADD COLUMN "defaultBankName" TEXT;
