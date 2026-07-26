-- Add Product Variants Support
-- Migration: add_product_variants

-- Create ProductVariant table
CREATE TABLE "ProductVariant" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId" TEXT NOT NULL,
  "sku" TEXT,
  "name" TEXT NOT NULL,
  "price" DOUBLE PRECISION,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create ProductVariantOption table (for variant attributes like Size: M, Color: Red)
CREATE TABLE "ProductVariantOption" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "variantId" TEXT NOT NULL,
  "optionName" TEXT NOT NULL,  -- e.g., "Size", "Color", "Material"
  "optionValue" TEXT NOT NULL, -- e.g., "M", "Red", "Cotton"
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "ProductVariantOption_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Add hasVariants flag to Product table
ALTER TABLE "Product" ADD COLUMN "hasVariants" BOOLEAN NOT NULL DEFAULT false;

-- Create indexes
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");
CREATE INDEX "ProductVariant_sku_idx" ON "ProductVariant"("sku");
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");
CREATE INDEX "ProductVariantOption_variantId_idx" ON "ProductVariantOption"("variantId");
CREATE INDEX "ProductVariantOption_optionName_idx" ON "ProductVariantOption"("optionName");

-- Add variantId to CartItem
ALTER TABLE "CartItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" 
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add variantId to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantOptions" JSONB;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" 
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "CartItem_variantId_idx" ON "CartItem"("variantId");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");
