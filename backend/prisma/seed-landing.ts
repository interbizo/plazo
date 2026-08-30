import { PrismaClient } from "@prisma/client";

export async function seedLandingContent(prisma: PrismaClient) {
  const hero = {
    eyebrow: "Untuk bisnis produk dan jasa",
    title: "Buat toko.",
    titleAccent: "Beri bisnis Anda arah.",
    description:
      "Plazo menyatukan toko, katalog, dan percakapan pelanggan agar bisnis Anda hadir dengan lebih jelas sejak awal.",
    isPublished: true,
  };

  const sectionHeaders = {
    benefits: {
      sectionEyebrow: "Satu fondasi kerja",
      sectionHeading: "Bukan sekadar halaman. Ini tempat bisnis Anda mulai terlihat utuh.",
      sectionDescription: "Setiap bagian membantu pelanggan memahami bisnis Anda sebelum percakapan dimulai.",
    },
    steps: {
      sectionEyebrow: "Cara kerja",
      sectionHeading: "Beri bisnis Anda jalur yang jelas untuk bergerak.",
      sectionDescription: "Buat toko, susun penawaran, lalu ubah minat menjadi percakapan yang relevan.",
    },
    advantages: {
      sectionEyebrow: "Keunggulan Plazo",
      sectionHeading: "Toko yang siap membantu bisnis terlihat serius.",
      sectionDescription: "Ruang yang sederhana untuk mulai, tanpa memaksa bisnis Anda terlihat sama dengan yang lain.",
    },
    testimonials: {
      sectionEyebrow: "Testimoni",
      sectionHeading: "Dibuat untuk bisnis yang ingin terlihat lebih siap.",
      sectionDescription: "Cerita dari pemilik bisnis yang memakai toko sebagai titik awal percakapan dengan pelanggan.",
    },
  };

  const benefits = [
    {
      id: "landing-benefit-identity",
      label: "Identitas bisnis",
      title: "Toko yang membawa nama brand Anda",
      description:
        "Tampilkan bisnis dengan ruang yang lebih meyakinkan daripada sekadar daftar tautan.",
      icon: "Store",
      tone: "blue",
      sortOrder: 0,
      isPublished: true,
    },
    {
      id: "landing-benefit-catalog",
      label: "Katalog siap pakai",
      title: "Produk dan jasa lebih mudah dipahami",
      description:
        "Susun penawaran agar calon pelanggan bisa melihat konteks sebelum menghubungi Anda.",
      icon: "Boxes",
      tone: "sky",
      sortOrder: 1,
      isPublished: true,
    },
    {
      id: "landing-benefit-chat",
      label: "Percakapan terarah",
      title: "Pelanggan tahu harus mulai dari mana",
      description:
        "Lanjutkan minat menjadi percakapan tanpa memisahkan toko dari hubungan pelanggan.",
      icon: "MessageCircle",
      tone: "indigo",
      sortOrder: 2,
      isPublished: true,
    },
    {
      id: "landing-benefit-foundation",
      label: "Satu fondasi",
      title: "Mulai sederhana, tetap siap berkembang",
      description:
        "Gunakan satu ruang untuk membangun kehadiran digital bisnis dengan lebih terarah.",
      icon: "BarChart3",
      tone: "cyan",
      sortOrder: 3,
      isPublished: true,
    },
  ];

  const steps = [
    {
      id: "landing-step-store",
      title: "Siapkan toko",
      description:
        "Atur identitas bisnis dan halaman yang siap menjadi pintu masuk pelanggan.",
      icon: "Store",
      sortOrder: 0,
      isPublished: true,
    },
    {
      id: "landing-step-offer",
      title: "Susun penawaran",
      description:
        "Tambahkan produk atau jasa dengan informasi yang membantu pelanggan memahami nilainya.",
      icon: "Boxes",
      sortOrder: 1,
      isPublished: true,
    },
    {
      id: "landing-step-chat",
      title: "Layani pelanggan",
      description:
        "Terima pertanyaan dan lanjutkan percakapan dari bisnis yang sudah terlihat siap.",
      icon: "MessageCircle",
      sortOrder: 2,
      isPublished: true,
    },
  ];

  const advantages = [
    {
      id: "landing-advantage-start",
      title: "Mulai tanpa membangun website dari nol",
      description:
        "Gunakan toko yang jelas sebagai pondasi awal kehadiran digital bisnis Anda.",
      sortOrder: 0,
      isPublished: true,
    },
    {
      id: "landing-advantage-context",
      title: "Katalog dan identitas hadir dalam satu pengalaman",
      description:
        "Produk, jasa, dan cerita bisnis tersusun konsisten untuk membangun kepercayaan.",
      sortOrder: 1,
      isPublished: true,
    },
    {
      id: "landing-advantage-conversation",
      title: "Minat pelanggan dapat langsung menjadi percakapan",
      description:
        "Beri pelanggan jalur yang jelas dari melihat penawaran ke bertanya.",
      sortOrder: 2,
      isPublished: true,
    },
    {
      id: "landing-advantage-growth",
      title: "Cukup ringan untuk mulai, siap untuk bertumbuh",
      description:
        "Bangun proses bisnis secara bertahap tanpa menambah kerumitan sejak awal.",
      sortOrder: 3,
      isPublished: true,
    },
  ];

  const testimonials = [
    {
      id: "landing-testimonial-nara",
      label: "Pemilik Nara Studio",
      title: "Nara Putri",
      description:
        "Sekarang calon pelanggan langsung melihat katalog dan tahu harus menghubungi kami dari mana.",
      sortOrder: 0,
      isPublished: true,
    },
    {
      id: "landing-testimonial-ruang",
      label: "Pendiri Ruang Rupa",
      title: "Raka Mahendra",
      description:
        "Plazo membuat penawaran jasa kami lebih mudah dipahami tanpa harus membuat website dari awal.",
      sortOrder: 1,
      isPublished: true,
    },
    {
      id: "landing-testimonial-kopi",
      label: "Pemilik Kopi Kecil",
      title: "Ayu Lestari",
      description:
        "Kami bisa membagikan satu alamat toko yang rapi ketika mengenalkan bisnis ke pelanggan baru.",
      sortOrder: 2,
      isPublished: true,
    },
  ];

  await prisma.landingHero.upsert({
    where: { key: "default" },
    update: hero,
    create: { id: "landing-hero-default", key: "default", ...hero },
  });

  await Promise.all([
    ...benefits.map(({ id, ...data }) =>
      prisma.landingBenefit.upsert({
        where: { id },
        update: { ...sectionHeaders.benefits, ...data },
        create: { id, ...sectionHeaders.benefits, ...data },
      }),
    ),
    ...steps.map(({ id, ...data }) =>
      prisma.landingStep.upsert({
        where: { id },
        update: { ...sectionHeaders.steps, ...data },
        create: { id, ...sectionHeaders.steps, ...data },
      }),
    ),
    ...advantages.map(({ id, ...data }) =>
      prisma.landingAdvantage.upsert({
        where: { id },
        update: { ...sectionHeaders.advantages, ...data },
        create: { id, ...sectionHeaders.advantages, ...data },
      }),
    ),
    ...testimonials.map(({ id, ...data }) =>
      prisma.landingTestimonial.upsert({
        where: { id },
        update: { ...sectionHeaders.testimonials, ...data },
        create: { id, ...sectionHeaders.testimonials, ...data },
      }),
    ),
  ]);

  return 1 + benefits.length + steps.length + advantages.length + testimonials.length;
}


if (require.main === module) {
  const prisma = new PrismaClient();
  seedLandingContent(prisma)
    .then((count) => console.log(`✅ Landing content seeded: ${count}`))
    .catch((error) => {
      console.error("Landing content seed failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
