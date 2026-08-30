DROP TABLE IF EXISTS "LandingPageContent";

CREATE TABLE "LandingBenefit" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Sparkles',
    "tone" TEXT NOT NULL DEFAULT 'blue',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingBenefit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingStep" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Store',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandingAdvantage" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LandingAdvantage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LandingBenefit_isPublished_sortOrder_idx" ON "LandingBenefit"("isPublished", "sortOrder");
CREATE INDEX "LandingStep_isPublished_sortOrder_idx" ON "LandingStep"("isPublished", "sortOrder");
CREATE INDEX "LandingAdvantage_isPublished_sortOrder_idx" ON "LandingAdvantage"("isPublished", "sortOrder");

INSERT INTO "LandingBenefit" ("id", "label", "title", "description", "icon", "tone", "sortOrder", "updatedAt") VALUES
  ('landing-benefit-identity', 'Identitas bisnis', 'Toko yang membawa nama brand Anda', 'Tampilkan bisnis dengan ruang yang lebih meyakinkan daripada sekadar daftar tautan.', 'Store', 'blue', 0, CURRENT_TIMESTAMP),
  ('landing-benefit-catalog', 'Katalog siap pakai', 'Produk dan jasa lebih mudah dipahami', 'Susun penawaran agar calon pelanggan bisa melihat konteks sebelum menghubungi Anda.', 'Boxes', 'sky', 1, CURRENT_TIMESTAMP),
  ('landing-benefit-chat', 'Percakapan terarah', 'Pelanggan tahu harus mulai dari mana', 'Lanjutkan minat menjadi percakapan tanpa memisahkan toko dari hubungan pelanggan.', 'MessageCircle', 'indigo', 2, CURRENT_TIMESTAMP),
  ('landing-benefit-foundation', 'Satu fondasi', 'Mulai sederhana, tetap siap berkembang', 'Gunakan satu ruang untuk membangun kehadiran digital bisnis dengan lebih terarah.', 'BarChart3', 'cyan', 3, CURRENT_TIMESTAMP);

INSERT INTO "LandingStep" ("id", "title", "description", "icon", "sortOrder", "updatedAt") VALUES
  ('landing-step-store', 'Siapkan toko', 'Atur identitas bisnis dan halaman yang siap menjadi pintu masuk pelanggan.', 'Store', 0, CURRENT_TIMESTAMP),
  ('landing-step-offer', 'Susun penawaran', 'Tambahkan produk atau jasa dengan informasi yang membantu pelanggan memahami nilainya.', 'Boxes', 1, CURRENT_TIMESTAMP),
  ('landing-step-chat', 'Layani pelanggan', 'Terima pertanyaan dan lanjutkan percakapan dari bisnis yang sudah terlihat siap.', 'MessageCircle', 2, CURRENT_TIMESTAMP);

INSERT INTO "LandingAdvantage" ("id", "title", "description", "sortOrder", "updatedAt") VALUES
  ('landing-advantage-start', 'Mulai tanpa membangun website dari nol', 'Gunakan toko yang jelas sebagai pondasi awal kehadiran digital bisnis Anda.', 0, CURRENT_TIMESTAMP),
  ('landing-advantage-context', 'Katalog dan identitas hadir dalam satu pengalaman', 'Produk, jasa, dan cerita bisnis tersusun konsisten untuk membangun kepercayaan.', 1, CURRENT_TIMESTAMP),
  ('landing-advantage-conversation', 'Minat pelanggan dapat langsung menjadi percakapan', 'Beri pelanggan jalur yang jelas dari melihat penawaran ke bertanya.', 2, CURRENT_TIMESTAMP),
  ('landing-advantage-growth', 'Cukup ringan untuk mulai, siap untuk bertumbuh', 'Bangun proses bisnis secara bertahap tanpa menambah kerumitan sejak awal.', 3, CURRENT_TIMESTAMP);
