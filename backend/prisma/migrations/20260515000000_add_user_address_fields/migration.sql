-- Add user address/profile fields used by registration and profile flows.
ALTER TABLE "User"
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "province" TEXT,
ADD COLUMN "postalCode" TEXT,
ADD COLUMN "whatsappNumber" TEXT;
