CREATE TYPE "ForumPostStatus" AS ENUM ('PUBLISHED', 'REMOVED');

ALTER TABLE "User" ADD COLUMN "isForumBanned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "forumBannedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "forumBannedReason" TEXT;

CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ForumPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ForumPostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumModerationSettings" (
    "id" TEXT NOT NULL,
    "isAntiSpamEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "postLimitPerWindow" INTEGER NOT NULL DEFAULT 3,
    "commentLimitPerWindow" INTEGER NOT NULL DEFAULT 12,
    "duplicateWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumModerationSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForumStrike" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForumStrike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForumPost_slug_key" ON "ForumPost"("slug");
CREATE UNIQUE INDEX "ForumLike_postId_userId_key" ON "ForumLike"("postId", "userId");
CREATE INDEX "ForumPost_status_createdAt_idx" ON "ForumPost"("status", "createdAt");
CREATE INDEX "ForumPost_authorId_createdAt_idx" ON "ForumPost"("authorId", "createdAt");
CREATE INDEX "ForumComment_postId_status_createdAt_idx" ON "ForumComment"("postId", "status", "createdAt");
CREATE INDEX "ForumComment_authorId_createdAt_idx" ON "ForumComment"("authorId", "createdAt");
CREATE INDEX "ForumLike_postId_idx" ON "ForumLike"("postId");
CREATE INDEX "ForumStrike_userId_createdAt_idx" ON "ForumStrike"("userId", "createdAt");

ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumComment" ADD CONSTRAINT "ForumComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumLike" ADD CONSTRAINT "ForumLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumStrike" ADD CONSTRAINT "ForumStrike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumStrike" ADD CONSTRAINT "ForumStrike_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForumStrike" ADD CONSTRAINT "ForumStrike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ForumStrike" ADD CONSTRAINT "ForumStrike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ForumComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
