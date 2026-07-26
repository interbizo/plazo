-- Add viewCount to Product and Service models
ALTER TABLE "Product" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
