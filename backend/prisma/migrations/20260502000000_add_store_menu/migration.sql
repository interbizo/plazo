-- CreateTable
CREATE TABLE "StoreMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "pageSlug" TEXT,
    "icon" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreMenu_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreMenu_tenantId_idx" ON "StoreMenu"("tenantId");

-- CreateIndex
CREATE INDEX "StoreMenu_tenantId_isVisible_sortOrder_idx" ON "StoreMenu"("tenantId", "isVisible", "sortOrder");

-- CreateIndex
CREATE INDEX "StoreMenu_parentId_idx" ON "StoreMenu"("parentId");

-- AddForeignKey
ALTER TABLE "StoreMenu" ADD CONSTRAINT "StoreMenu_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreMenu" ADD CONSTRAINT "StoreMenu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StoreMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
