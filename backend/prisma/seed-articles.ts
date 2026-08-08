import {
  AccountStatus,
  ArticleSource,
  ArticleStatus,
  PrismaClient,
  UserRole,
} from "@prisma/client";

let prisma = new PrismaClient();

const MIN_PUBLISH_WORDS = 800;
const MAX_ARTICLE_WORDS = 1600;
const WORDS_PER_MINUTE = 200;

const categories = [
  {
    name: "Panduan Seller",
    slug: "panduan-seller",
    description:
      "Panduan praktis untuk seller dalam membuat listing, mengelola toko, dan menjaga kualitas layanan.",
    sortOrder: 1,
  },
  {
    name: "Panduan Buyer",
    slug: "panduan-buyer",
    description:
      "Tips untuk buyer saat memilih produk, membandingkan seller, dan berkomunikasi sebelum transaksi.",
    sortOrder: 2,
  },
  {
    name: "Optimasi Marketplace",
    slug: "optimasi-marketplace",
    description:
      "Artikel tentang visibilitas listing, konten, SEO marketplace, dan performa toko.",
    sortOrder: 3,
  },
  {
    name: "Komunitas",
    slug: "komunitas",
    description:
      "Informasi tentang diskusi komunitas, moderasi, keamanan, dan kebiasaan penggunaan platform.",
    sortOrder: 4,
  },
];

type ArticleSeed = {
  title: string;
  slug: string;
  categorySlug: string;
  excerpt: string;
  tags: string[];
  thumbnail: string;
  status: ArticleStatus;
  publishedDaysAgo?: number;
  viewCount: number;
  topic: string;
  sections: string[];
};

const articles: ArticleSeed[] = [
  {
    title: "Cara Membuat Listing yang Lebih Mudah Dipahami Buyer",
    slug: "cara-membuat-listing-yang-lebih-mudah-dipahami-buyer",
    categorySlug: "panduan-seller",
    excerpt:
      "Panduan membuat listing yang jelas, ringkas, dan mudah dibandingkan oleh buyer sebelum mereka menghubungi seller.",
    tags: ["seller", "listing", "marketplace", "deskripsi"],
    thumbnail:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.PUBLISHED,
    publishedDaysAgo: 7,
    viewCount: 184,
    topic: "listing seller",
    sections: [
      "Buyer biasanya membuka banyak listing dalam waktu singkat. Mereka mencari sinyal cepat tentang manfaat, harga, proses kerja, dan bukti kualitas. Karena itu listing yang baik perlu menjawab pertanyaan utama sejak paragraf awal.",
      "Judul sebaiknya tidak hanya menyebut nama produk atau layanan. Tambahkan konteks yang membantu buyer memahami hasilnya, seperti jenis bisnis, format deliverable, atau kebutuhan yang paling sering muncul.",
      "Urutan informasi yang paling mudah dipahami biasanya dimulai dari ringkasan manfaat, detail paket, proses kerja, estimasi waktu, lalu syarat atau batasan layanan.",
      "Thumbnail dan gambar pendukung sebaiknya memperlihatkan hasil nyata, contoh penggunaan, atau variasi paket. Gambar yang terlalu dekoratif sering terlihat menarik tetapi kurang membantu keputusan buyer.",
    ],
  },
  {
    title: "Mengelola Komunikasi dengan Buyer agar Proyek Tetap Rapi",
    slug: "mengelola-komunikasi-dengan-buyer-agar-proyek-tetap-rapi",
    categorySlug: "panduan-seller",
    excerpt:
      "Praktik komunikasi yang membantu seller menjaga scope, deadline, dan ekspektasi buyer selama proses kerja.",
    tags: ["seller", "komunikasi", "proyek", "operasional"],
    thumbnail:
      "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.PUBLISHED,
    publishedDaysAgo: 6,
    viewCount: 142,
    topic: "komunikasi proyek",
    sections: [
      "Setelah buyer menjelaskan kebutuhan, seller sebaiknya menulis ulang brief dalam versi singkat. Rangkuman ini membantu memastikan kedua pihak memahami scope yang sama sebelum pekerjaan dimulai.",
      "Dalam chat, seller sering perlu memberi rekomendasi. Buat perbedaan yang jelas antara hal yang sudah disepakati dan saran tambahan agar buyer mudah mengambil keputusan.",
      "Keputusan tentang deadline, format file, gaya desain, jumlah revisi, atau prioritas fitur perlu dicatat secara eksplisit. Jangan hanya mengandalkan ingatan dari percakapan panjang.",
      "Update tidak harus panjang, tetapi harus menjawab progres, hambatan, dan langkah berikutnya. Buyer merasa lebih tenang ketika tahu pekerjaan berjalan sesuai tahap.",
    ],
  },
  {
    title: "Strategi Menulis Deskripsi Produk Digital yang Menjual",
    slug: "strategi-menulis-deskripsi-produk-digital-yang-menjual",
    categorySlug: "panduan-seller",
    excerpt:
      "Cara menyusun deskripsi produk digital agar manfaat, isi paket, dan nilai produk lebih mudah dipahami calon pembeli.",
    tags: ["produk-digital", "copywriting", "seo", "seller"],
    thumbnail:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.PUBLISHED,
    publishedDaysAgo: 5,
    viewCount: 128,
    topic: "deskripsi produk digital",
    sections: [
      "Produk digital sering dijual sebagai file, template, atau akses unduhan. Namun buyer membeli karena ingin hasil tertentu, bukan sekadar format file.",
      "Buyer perlu tahu jumlah file, format, ukuran, versi, lisensi penggunaan, dan apakah produk bisa diedit. Informasi seperti ini sebaiknya ditulis dalam bagian khusus.",
      "Contoh penggunaan membantu buyer membayangkan manfaat produk. Template presentasi bisa dipakai untuk pitch deck, laporan bulanan, atau proposal klien.",
      "FAQ membantu menjawab keraguan sebelum buyer menghubungi seller. Pertanyaan yang sering muncul biasanya tentang cara akses, kompatibilitas aplikasi, dan lisensi komersial.",
    ],
  },
  {
    title: "Checklist Aman Sebelum Memilih Seller di Marketplace",
    slug: "checklist-aman-sebelum-memilih-seller-di-marketplace",
    categorySlug: "panduan-buyer",
    excerpt:
      "Beberapa hal yang bisa dicek buyer sebelum memilih seller agar proses komunikasi dan pembelian lebih aman.",
    tags: ["buyer", "keamanan", "seller", "checklist"],
    thumbnail:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.PUBLISHED,
    publishedDaysAgo: 4,
    viewCount: 116,
    topic: "pemilihan seller",
    sections: [
      "Profil seller yang lengkap tidak otomatis menjamin kualitas, tetapi memberi sinyal awal bahwa seller serius mengelola toko dan penawarannya.",
      "Banyak masalah transaksi muncul karena buyer hanya membaca manfaat utama tanpa mengecek batasan. Perhatikan apa saja yang termasuk paket dan apa yang tidak termasuk.",
      "Sebelum membeli, ajukan pertanyaan yang spesifik dan lihat cara seller menjawab. Seller yang baik biasanya mampu menjelaskan proses dengan bahasa yang mudah dipahami.",
      "Portofolio, contoh hasil, rating, dan ulasan dapat membantu buyer menilai kecocokan. Namun semua bukti itu perlu dibaca sesuai konteks.",
    ],
  },
  {
    title: "Memahami Moderasi dan Keamanan Komunitas Plazo",
    slug: "memahami-moderasi-dan-keamanan-komunitas-plazo",
    categorySlug: "komunitas",
    excerpt:
      "Ringkasan cara kerja moderasi forum, anti-spam, dan strike agar diskusi komunitas tetap aman dan relevan.",
    tags: ["komunitas", "moderasi", "forum", "anti-spam"],
    thumbnail:
      "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.PUBLISHED,
    publishedDaysAgo: 3,
    viewCount: 89,
    topic: "moderasi komunitas",
    sections: [
      "Forum yang sehat membutuhkan aturan yang jelas. Moderasi bukan hanya menghapus konten, tetapi menjaga agar pertanyaan dan jawaban tetap relevan dengan marketplace.",
      "Anti-spam membantu membatasi post dan komentar yang terlalu sering dalam waktu singkat. Sistem ini tidak menggantikan moderator, tetapi mengurangi beban pemeriksaan manual.",
      "Strike diberikan ketika moderator menilai ada pelanggaran yang perlu dicatat. Satu strike sebaiknya menjadi peringatan agar pengguna memperbaiki perilaku.",
      "Forum ban membatasi aktivitas forum, sedangkan suspend akun platform membatasi akses lebih luas dan biasanya berkaitan dengan pelanggaran akun yang lebih serius.",
    ],
  },
  {
    title: "Draft Ide Kalender Konten untuk Seller Baru",
    slug: "draft-ide-kalender-konten-untuk-seller-baru",
    categorySlug: "optimasi-marketplace",
    excerpt:
      "Contoh artikel draft untuk menguji filter status dan tampilan admin sebelum artikel dipublikasikan.",
    tags: ["draft", "konten", "seller"],
    thumbnail:
      "https://images.unsplash.com/photo-1506784365847-bbad939e9335?auto=format&fit=crop&w=1200&q=80",
    status: ArticleStatus.DRAFT,
    viewCount: 0,
    topic: "kalender konten",
    sections: [
      "Artikel draft ini disiapkan untuk menguji halaman admin. Isinya belum perlu muncul di halaman publik, tetapi tetap memiliki kategori, tag, thumbnail, dan ringkasan.",
    ],
  },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(value: string) {
  const text = stripHtml(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3).trim()}...`;
}

function buildContent(seed: ArticleSeed) {
  const paragraphs = [
    `<p>${seed.excerpt} Artikel ini membahas ${seed.topic} dengan pendekatan praktis untuk pengguna Plazo.</p>`,
    ...seed.sections.flatMap((section, index) => [
      `<h2>Bagian ${index + 1}</h2>`,
      `<p>${section}</p>`,
      "<p>Dalam konteks marketplace, informasi yang jelas membuat pengguna lebih cepat mengambil keputusan. Seller dapat mengurangi pertanyaan berulang, sementara buyer dapat membandingkan pilihan dengan lebih objektif. Perbaikan kecil seperti struktur kalimat, urutan informasi, dan contoh konkret sering memberi dampak besar pada kualitas interaksi.</p>",
    ]),
    "<h2>Langkah berikutnya</h2>",
    "<p>Mulailah dari satu perubahan yang mudah dicek. Setelah itu bandingkan respons pengguna, jumlah pertanyaan yang masuk, dan kualitas percakapan yang terjadi. Jika hasilnya membaik, jadikan pola tersebut sebagai standar baru untuk aktivitas berikutnya.</p>",
  ];

  let content = paragraphs.join("\n");
  while (seed.status === ArticleStatus.PUBLISHED && countWords(content) < 850) {
    content +=
      "\n<p>Evaluasi rutin membantu pengguna melihat apakah perubahan yang dilakukan benar-benar berdampak. Perhatikan data sederhana seperti jumlah kunjungan, pertanyaan yang berulang, dan feedback dari lawan transaksi. Dari sana, seller atau buyer bisa memperbaiki detail kecil tanpa membuat proses menjadi rumit.</p>";
  }

  return content;
}

function getStats(content: string, status: ArticleStatus) {
  const wordCount = countWords(content);
  if (status === ArticleStatus.PUBLISHED && wordCount < MIN_PUBLISH_WORDS) {
    throw new Error(`Artikel published minimal ${MIN_PUBLISH_WORDS} kata. Saat ini ${wordCount} kata.`);
  }
  if (wordCount > MAX_ARTICLE_WORDS) {
    throw new Error(`Artikel maksimal ${MAX_ARTICLE_WORDS} kata. Saat ini ${wordCount} kata.`);
  }
  return {
    wordCount,
    readingTimeMinutes: Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE)),
  };
}

async function getAuthorId() {
  const envEmail = process.env.ARTICLE_AUTHOR_EMAIL?.trim();
  const fallbackEmails = [
    "admin@plazo.id",
    "superadmin@plazo.id",
    "admin@plazo.com",
    "superadmin@plazo.com",
  ];

  if (envEmail) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: envEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (!user) throw new Error(`Author artikel ${envEmail} tidak ditemukan.`);
    return user.id;
  }

  for (const email of fallbackEmails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (user) return user.id;
  }

  const user = await prisma.user.findFirst({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      isActive: true,
      accountStatus: AccountStatus.ACTIVE,
      deletedAt: null,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!user) {
    throw new Error(
      "Tidak ada admin existing untuk author artikel. Jalankan seed utama dulu atau isi ARTICLE_AUTHOR_EMAIL.",
    );
  }

  return user.id;
}

export async function seedArticles(prismaClient?: PrismaClient) {
  if (prismaClient) prisma = prismaClient;
  const authorId = await getAuthorId();
  const categoryIds = new Map<string, string>();

  for (const category of categories) {
    const saved = await prisma.articleCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      select: { id: true, slug: true },
    });
    categoryIds.set(saved.slug, saved.id);
  }

  for (const seed of articles) {
    const categoryId = categoryIds.get(seed.categorySlug);
    if (!categoryId) throw new Error(`Kategori ${seed.categorySlug} tidak ditemukan.`);

    const content = buildContent(seed);
    const stats = getStats(content, seed.status);
    const publishedAt =
      seed.status === ArticleStatus.PUBLISHED
        ? daysAgo(seed.publishedDaysAgo || 1)
        : null;

    await prisma.article.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        excerpt: seed.excerpt,
        content,
        thumbnail: seed.thumbnail,
        tags: seed.tags,
        categoryId,
        status: seed.status,
        source: ArticleSource.MANUAL,
        wordCount: stats.wordCount,
        readingTimeMinutes: stats.readingTimeMinutes,
        viewCount: seed.viewCount,
        metaTitle: truncate(seed.title, 70),
        metaDescription: truncate(seed.excerpt, 180),
        metaKeywords: seed.tags.join(", "),
        ogImage: seed.thumbnail,
        createdBy: authorId,
        publishedAt,
      },
      create: {
        title: seed.title,
        slug: seed.slug,
        excerpt: seed.excerpt,
        content,
        thumbnail: seed.thumbnail,
        tags: seed.tags,
        categoryId,
        status: seed.status,
        source: ArticleSource.MANUAL,
        wordCount: stats.wordCount,
        readingTimeMinutes: stats.readingTimeMinutes,
        viewCount: seed.viewCount,
        metaTitle: truncate(seed.title, 70),
        metaDescription: truncate(seed.excerpt, 180),
        metaKeywords: seed.tags.join(", "),
        ogImage: seed.thumbnail,
        createdBy: authorId,
        publishedAt,
      },
    });
  }

  console.log("Article dummy data created.");
  console.table(
    articles.map((article) => ({
      status: article.status,
      slug: article.slug,
      category: article.categorySlug,
    })),
  );
}

// Jalankan langsung hanya ketika file ini dieksekusi sebagai script utama.
if (require.main === module) {
  seedArticles()
    .catch((error) => {
      console.error("Failed to seed article dummy data.");
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
