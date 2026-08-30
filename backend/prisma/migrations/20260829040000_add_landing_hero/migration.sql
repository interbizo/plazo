CREATE TABLE "LandingHero" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "eyebrow" TEXT NOT NULL DEFAULT 'Untuk bisnis produk dan jasa',
    "title" TEXT NOT NULL DEFAULT 'Buat toko.',
    "titleAccent" TEXT NOT NULL DEFAULT 'Beri bisnis Anda arah.',
    "description" TEXT NOT NULL DEFAULT 'Plazo menyatukan toko, katalog, dan percakapan pelanggan agar bisnis Anda hadir dengan lebih jelas sejak awal.',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingHero_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LandingHero_key_key" ON "LandingHero"("key");
CREATE INDEX "LandingHero_isPublished_idx" ON "LandingHero"("isPublished");

INSERT INTO "LandingHero" ("id", "key", "updatedAt")
VALUES ('landing-hero-default', 'default', CURRENT_TIMESTAMP);
