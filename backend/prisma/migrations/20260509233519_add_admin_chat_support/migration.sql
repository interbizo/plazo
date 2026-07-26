-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN "isAdminChat" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChatRoom" ADD COLUMN "adminUserId" TEXT;

-- CreateIndex
CREATE INDEX "ChatRoom_isAdminChat_idx" ON "ChatRoom"("isAdminChat");

-- CreateIndex
CREATE INDEX "ChatRoom_adminUserId_idx" ON "ChatRoom"("adminUserId");
