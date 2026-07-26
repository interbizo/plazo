-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_isRead_idx" ON "Notification"("tenantId", "userId", "isRead");

-- CreateIndex
CREATE INDEX "Order_sellerId_status_idx" ON "Order"("sellerId", "status");

-- CreateIndex
CREATE INDEX "Order_buyerId_status_idx" ON "Order"("buyerId", "status");

-- CreateIndex
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Order_sellerId_createdAt_idx" ON "Order"("sellerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_sellerId_status_createdAt_idx" ON "Order"("sellerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_isPublished_deletedAt_idx" ON "Product"("tenantId", "isPublished", "deletedAt");

-- CreateIndex
CREATE INDEX "Product_tenantId_categoryId_isPublished_idx" ON "Product"("tenantId", "categoryId", "isPublished");

-- CreateIndex
CREATE INDEX "Review_receiverId_rating_idx" ON "Review"("receiverId", "rating");

-- CreateIndex
CREATE INDEX "Service_tenantId_isPublished_deletedAt_idx" ON "Service"("tenantId", "isPublished", "deletedAt");

-- CreateIndex
CREATE INDEX "Transaction_userId_type_idx" ON "Transaction"("userId", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");
