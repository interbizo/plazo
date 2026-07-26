-- CreateTable
CREATE TABLE "SubscriptionPlanConfig" (
    "id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "badge" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearlyPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "postsLimit" INTEGER NOT NULL DEFAULT 10,
    "maxImagesPerPost" INTEGER NOT NULL DEFAULT 5,
    "maxFileSize" INTEGER NOT NULL DEFAULT 10,
    "canPublishToMarketplace" BOOLEAN NOT NULL DEFAULT false,
    "canVerifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "canFeaturedStore" BOOLEAN NOT NULL DEFAULT false,
    "canHighlightProducts" BOOLEAN NOT NULL DEFAULT false,
    "canPriorityListing" BOOLEAN NOT NULL DEFAULT false,
    "canCustomDomain" BOOLEAN NOT NULL DEFAULT false,
    "canAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "canBulkUpload" BOOLEAN NOT NULL DEFAULT false,
    "canExportData" BOOLEAN NOT NULL DEFAULT false,
    "canFlashSale" BOOLEAN NOT NULL DEFAULT false,
    "canCustomTheme" BOOLEAN NOT NULL DEFAULT false,
    "canRemoveBranding" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanConfig_plan_key" ON "SubscriptionPlanConfig"("plan");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_plan_idx" ON "SubscriptionPlanConfig"("plan");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_isActive_sortOrder_idx" ON "SubscriptionPlanConfig"("isActive", "sortOrder");
