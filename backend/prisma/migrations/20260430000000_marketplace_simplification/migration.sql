-- Migration: marketplace_simplification
-- Description: 
--   1. Tambah field city/latitude/longitude di Product, Service, Job, Tenant (filter lokasi)
--   2. Rename isBosted → isBoosted di Product, Service, Job
--   3. Tambah contextType/contextId/contextTitle di ChatRoom (konteks item saat chat)
--   4. Buat orderId optional di Review (transaksi internal dihapus)
--   5. Update unique constraint Review (hapus orderId dari unique key)

-- ============================================
-- DROP OLD INDEXES
-- ============================================

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_orderId_fkey";

-- DropIndex (old isBosted indexes)
DROP INDEX IF EXISTS "Job_isBosted_idx";
DROP INDEX IF EXISTS "Product_isBosted_idx";
DROP INDEX IF EXISTS "Service_isBosted_idx";

-- DropIndex (old Review unique constraint with orderId)
DROP INDEX IF EXISTS "Review_orderId_giverId_productId_serviceId_key";

-- ============================================
-- ALTER TABLES
-- ============================================

-- ChatRoom: tambah konteks produk/layanan/lowongan
ALTER TABLE "ChatRoom" ADD COLUMN "contextId" TEXT,
ADD COLUMN "contextTitle" TEXT,
ADD COLUMN "contextType" TEXT;

-- Job: tambah city + rename isBosted → isBoosted
ALTER TABLE "Job" ADD COLUMN "city" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

-- Migrate isBosted data ke isBoosted sebelum drop
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Job' AND column_name='isBosted') THEN
    ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
    UPDATE "Job" SET "isBoosted" = "isBosted";
    ALTER TABLE "Job" DROP COLUMN "isBosted";
  ELSE
    ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Product: tambah city + rename isBosted → isBoosted
ALTER TABLE "Product" ADD COLUMN "city" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Product' AND column_name='isBosted') THEN
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
    UPDATE "Product" SET "isBoosted" = "isBosted";
    ALTER TABLE "Product" DROP COLUMN "isBosted";
  ELSE
    ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Service: tambah city + rename isBosted → isBoosted
ALTER TABLE "Service" ADD COLUMN "city" TEXT,
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Service' AND column_name='isBosted') THEN
    ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
    UPDATE "Service" SET "isBoosted" = "isBosted";
    ALTER TABLE "Service" DROP COLUMN "isBosted";
  ELSE
    ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "isBoosted" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Tenant: tambah city/latitude/longitude
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Review: buat orderId optional
ALTER TABLE "Review" ALTER COLUMN "orderId" DROP NOT NULL;

-- Review: tambah field baru jika belum ada
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "communicationRating" INTEGER,
ADD COLUMN IF NOT EXISTS "helpfulCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "recommendRating" INTEGER,
ADD COLUMN IF NOT EXISTS "serviceRating" INTEGER;

-- ============================================
-- CREATE NEW INDEXES
-- ============================================

-- ChatRoom context index
CREATE INDEX IF NOT EXISTS "ChatRoom_contextType_contextId_idx" ON "ChatRoom"("contextType", "contextId");

-- Job indexes
CREATE INDEX IF NOT EXISTS "Job_isBoosted_idx" ON "Job"("isBoosted");
CREATE INDEX IF NOT EXISTS "Job_city_idx" ON "Job"("city");

-- Product indexes
CREATE INDEX IF NOT EXISTS "Product_isBoosted_idx" ON "Product"("isBoosted");
CREATE INDEX IF NOT EXISTS "Product_city_idx" ON "Product"("city");

-- Service indexes
CREATE INDEX IF NOT EXISTS "Service_isBoosted_idx" ON "Service"("isBoosted");
CREATE INDEX IF NOT EXISTS "Service_city_idx" ON "Service"("city");

-- Tenant index
CREATE INDEX IF NOT EXISTS "Tenant_city_idx" ON "Tenant"("city");

-- Review indexes
CREATE INDEX IF NOT EXISTS "Review_orderId_idx" ON "Review"("orderId");
CREATE INDEX IF NOT EXISTS "Review_isVerified_idx" ON "Review"("isVerified");
CREATE INDEX IF NOT EXISTS "Review_isPublic_idx" ON "Review"("isPublic");
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

-- Review unique constraint (tanpa orderId)
CREATE UNIQUE INDEX IF NOT EXISTS "Review_giverId_productId_serviceId_key" ON "Review"("giverId", "productId", "serviceId");

-- ============================================
-- RE-ADD FOREIGN KEY (optional orderId)
-- ============================================

ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
