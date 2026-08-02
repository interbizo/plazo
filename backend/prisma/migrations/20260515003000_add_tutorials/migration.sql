-- Add tutorial content for platform guidance.
CREATE TYPE "TutorialCategory" AS ENUM ('GETTING_STARTED', 'SELLER_GUIDE', 'BUYER_GUIDE', 'FEATURES', 'PAYMENT', 'SHIPPING', 'TROUBLESHOOTING', 'FAQ', 'OTHER');
CREATE TYPE "TutorialTargetRole" AS ENUM ('ALL', 'BUYER', 'SELLER');

CREATE TABLE "Tutorial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "category" "TutorialCategory" NOT NULL DEFAULT 'OTHER',
    "targetRole" "TutorialTargetRole" NOT NULL DEFAULT 'ALL',
    "thumbnail" TEXT,
    "videoUrl" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Tutorial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tutorial_slug_key" ON "Tutorial"("slug");
CREATE INDEX "Tutorial_category_idx" ON "Tutorial"("category");
CREATE INDEX "Tutorial_targetRole_idx" ON "Tutorial"("targetRole");
CREATE INDEX "Tutorial_isPublished_idx" ON "Tutorial"("isPublished");
CREATE INDEX "Tutorial_isFeatured_idx" ON "Tutorial"("isFeatured");
CREATE INDEX "Tutorial_sortOrder_idx" ON "Tutorial"("sortOrder");
CREATE INDEX "Tutorial_slug_idx" ON "Tutorial"("slug");
