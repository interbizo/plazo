-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Village" (
    "id" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Village_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "District_cityId_idx" ON "District"("cityId");

-- CreateIndex
CREATE INDEX "District_isActive_idx" ON "District"("isActive");

-- CreateIndex
CREATE INDEX "District_sortOrder_idx" ON "District"("sortOrder");

-- CreateIndex
CREATE INDEX "Village_districtId_idx" ON "Village"("districtId");

-- CreateIndex
CREATE INDEX "Village_isActive_idx" ON "Village"("isActive");

-- CreateIndex
CREATE INDEX "Village_sortOrder_idx" ON "Village"("sortOrder");

-- AddForeignKey
ALTER TABLE "District" ADD CONSTRAINT "District_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Village" ADD CONSTRAINT "Village_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
