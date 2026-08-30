CREATE TABLE "LandingTestimonial" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LandingTestimonial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LandingTestimonial_isPublished_sortOrder_idx" ON "LandingTestimonial"("isPublished", "sortOrder");

INSERT INTO "LandingTestimonial" ("id", "label", "title", "description", "sortOrder", "updatedAt") VALUES
  ('landing-testimonial-nara', 'Pemilik Nara Studio', 'Nara Putri', 'Sekarang calon pelanggan langsung melihat katalog dan tahu harus menghubungi kami dari mana.', 0, CURRENT_TIMESTAMP),
  ('landing-testimonial-ruang', 'Pendiri Ruang Rupa', 'Raka Mahendra', 'Plazo membuat penawaran jasa kami lebih mudah dipahami tanpa harus membuat website dari awal.', 1, CURRENT_TIMESTAMP),
  ('landing-testimonial-kopi', 'Pemilik Kopi Kecil', 'Ayu Lestari', 'Kami bisa membagikan satu alamat toko yang rapi ketika mengenalkan bisnis ke pelanggan baru.', 2, CURRENT_TIMESTAMP);
