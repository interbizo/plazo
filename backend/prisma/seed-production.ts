import { PrismaClient, UserRole, SubscriptionPlan, CategoryType, KycStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

// Seeder PRODUCTION — hanya mengisi reference data + user admin/superadmin.
// Aman dijalankan berulang (semua pakai upsert). Tidak membuat demo user/produk.
// Jalankan: npx ts-node prisma/seed-production.ts
const prisma = new PrismaClient();

const PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Password@123";

async function seedPlans() {
  const plans = [
    {
      plan: SubscriptionPlan.FREE,
      name: "Gratis",
      description: "Mulai jualan dengan katalog toko, chat buyer, dan analytics dasar.",
      sortOrder: 0,
      monthlyPrice: 0,
      yearlyPrice: null,
      postsLimit: 10,
      maxImagesPerPost: 3,
      maxFileSize: 5,
      canPublishToMarketplace: false,
      canVerifiedBadge: false,
      canFeaturedStore: false,
      canHighlightProducts: false,
      canPriorityListing: false,
      canAdvancedAnalytics: false,
      canBulkUpload: false,
      canExportData: false,
      canFlashSale: false,
      canCustomTheme: false,
      canRemoveBranding: false,
      canRequestPhysicalVerification: false,
      canSubmitProposal: false,
      canWhatsappCheckout: false,
      canToolsRecommendation: false,
      canBecomeAffiliate: false,
      canBoostListing: false,
      features: ["10 produk atau jasa", "Toko subdomain", "Chat buyer", "Wishlist"],
    },
    {
      plan: SubscriptionPlan.BASIC,
      name: "Basic",
      description: "Untuk seller yang siap tampil di marketplace utama.",
      badge: "Populer",
      sortOrder: 1,
      monthlyPrice: 49000,
      yearlyPrice: 490000,
      postsLimit: 50,
      maxImagesPerPost: 5,
      maxFileSize: 10,
      canPublishToMarketplace: true,
      canVerifiedBadge: true,
      canFeaturedStore: false,
      canHighlightProducts: false,
      canPriorityListing: false,
      canAdvancedAnalytics: false,
      canBulkUpload: true,
      canExportData: true,
      canFlashSale: true,
      canCustomTheme: false,
      canRemoveBranding: false,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
      canBoostListing: false,
      features: ["50 listing", "Publish marketplace", "Verified badge", "Flash sale"],
    },
    {
      plan: SubscriptionPlan.PREMIUM,
      name: "Premium",
      description: "Fitur promosi dan tema toko untuk seller aktif.",
      badge: "Best Value",
      sortOrder: 2,
      monthlyPrice: 99000,
      yearlyPrice: 990000,
      postsLimit: 100,
      maxImagesPerPost: 8,
      maxFileSize: 20,
      canPublishToMarketplace: true,
      canVerifiedBadge: true,
      canFeaturedStore: true,
      canHighlightProducts: true,
      canPriorityListing: false,
      canAdvancedAnalytics: true,
      canBulkUpload: true,
      canExportData: true,
      canFlashSale: true,
      canCustomTheme: true,
      canRemoveBranding: false,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
      canBoostListing: true,
      features: ["100 listing", "Featured store", "Highlight produk", "Advanced analytics"],
    },
    {
      plan: SubscriptionPlan.PROFESSIONAL,
      name: "Professional",
      description: "Priority listing dan kapasitas lebih besar untuk seller profesional.",
      sortOrder: 3,
      monthlyPrice: 149000,
      yearlyPrice: 1490000,
      postsLimit: 200,
      maxImagesPerPost: 10,
      maxFileSize: 30,
      canPublishToMarketplace: true,
      canVerifiedBadge: true,
      canFeaturedStore: true,
      canHighlightProducts: true,
      canPriorityListing: true,
      canAdvancedAnalytics: true,
      canBulkUpload: true,
      canExportData: true,
      canFlashSale: true,
      canCustomTheme: true,
      canRemoveBranding: false,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
      canBoostListing: true,
      features: ["200 listing", "Priority listing", "Semua fitur Premium"],
    },
    {
      plan: SubscriptionPlan.ENTERPRISE,
      name: "Enterprise",
      description: "Unlimited listing dan branding toko penuh untuk bisnis besar.",
      sortOrder: 4,
      monthlyPrice: 499000,
      yearlyPrice: 4990000,
      postsLimit: 999999,
      maxImagesPerPost: 10,
      maxFileSize: 50,
      canPublishToMarketplace: true,
      canVerifiedBadge: true,
      canFeaturedStore: true,
      canHighlightProducts: true,
      canPriorityListing: true,
      canAdvancedAnalytics: true,
      canBulkUpload: true,
      canExportData: true,
      canFlashSale: true,
      canCustomTheme: true,
      canRemoveBranding: true,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
      canBoostListing: true,
      features: ["Unlimited listing", "Remove branding", "Semua fitur Professional"],
    },
    {
      plan: SubscriptionPlan.ULTIMATE,
      name: "Ultimate",
      description: "Paket tertinggi dengan prioritas support dan tooling premium.",
      badge: "Priority",
      sortOrder: 5,
      monthlyPrice: 999000,
      yearlyPrice: 9990000,
      postsLimit: 999999,
      maxImagesPerPost: 10,
      maxFileSize: 50,
      canPublishToMarketplace: true,
      canVerifiedBadge: true,
      canFeaturedStore: true,
      canHighlightProducts: true,
      canPriorityListing: true,
      canAdvancedAnalytics: true,
      canBulkUpload: true,
      canExportData: true,
      canFlashSale: true,
      canCustomTheme: true,
      canRemoveBranding: true,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
      canBoostListing: true,
      features: ["Semua fitur Enterprise", "Priority support", "Dedicated account"],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: { plan: plan.plan },
      update: plan,
      create: plan,
    });
  }
  console.log(`✅ Plans: ${plans.length}`);
}

async function seedCategories() {
  const categories = [
    {
      name: "Template Digital",
      slug: "template-digital",
      type: CategoryType.PRODUCT,
      description: "Template desain, dokumen, spreadsheet, dan aset digital.",
    },
    {
      name: "Produk Fisik",
      slug: "produk-fisik",
      type: CategoryType.PRODUCT,
      description: "Produk siap kirim dari seller lokal.",
    },
    {
      name: "Aplikasi & Tools",
      slug: "aplikasi-tools",
      type: CategoryType.PRODUCT,
      description: "Lisensi, plugin, dan tools digital.",
    },
    {
      name: "Desain & Branding",
      slug: "desain-branding",
      type: CategoryType.SERVICE,
      description: "Logo, identitas brand, UI/UX, dan materi promosi.",
    },
    {
      name: "Website & Automasi",
      slug: "website-automasi",
      type: CategoryType.SERVICE,
      description: "Landing page, website toko, integrasi, dan automasi bisnis.",
    },
    {
      name: "Konten & Marketing",
      slug: "konten-marketing",
      type: CategoryType.SERVICE,
      description: "Copywriting, konten sosial media, SEO, dan campaign.",
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug_type: { slug: category.slug, type: category.type } },
      update: category,
      create: category,
    });
  }
  console.log(`✅ Categories: ${categories.length}`);
}

async function seedPlatformSettings() {
  const defaults = [
    { key: 'module.forum', value: 'true', description: 'Toggle modul Forum Diskusi ON/OFF' },
    { key: 'module.article', value: 'true', description: 'Toggle modul Artikel ON/OFF' },
    { key: 'module.jobs', value: 'true', description: 'Toggle modul Job Board & Proposal ON/OFF' },
    { key: 'module.referral', value: 'false', description: 'Toggle modul Referral ON/OFF (belum aktif)' },
    { key: 'maintenance.enabled', value: 'false', description: 'Global maintenance mode — semua user non-admin akan melihat halaman maintenance' },
    { key: 'maintenance.message', value: 'Kami sedang melakukan perbaikan untuk meningkatkan layanan. Silakan coba beberapa saat lagi.', description: 'Pesan yang ditampilkan di halaman maintenance' },
    { key: 'maintenance.estimated_end', value: '', description: 'Estimasi waktu maintenance selesai (format ISO 8601, kosong jika tidak diketahui)' },
    { key: 'maintenance.title', value: 'Sedang Dalam Perbaikan', description: 'Judul halaman maintenance' },
  ];

  for (const setting of defaults) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log("✅ Platform settings");
}

async function seedPaymentAccounts() {
  const accounts = [
    {
      type: 'BANK_TRANSFER',
      bankName: 'BCA',
      accountNumber: '1234567890',
      accountName: 'PT Plazo Indonesia',
      isActive: true,
      isPrimary: true,
      isVerified: true,
    },
    {
      type: 'BANK_TRANSFER',
      bankName: 'Mandiri',
      accountNumber: '0987654321',
      accountName: 'PT Plazo Indonesia',
      isActive: true,
      isPrimary: false,
      isVerified: true,
    },
    {
      type: 'E_WALLET',
      walletType: 'OVO',
      phoneNumber: '081234567890',
      accountNumber: '081234567890',
      accountName: 'PT Plazo Indonesia',
      isActive: true,
      isPrimary: false,
      isVerified: true,
    },
    {
      type: 'E_WALLET',
      walletType: 'GoPay',
      phoneNumber: '081234567890',
      accountNumber: '081234567890',
      accountName: 'PT Plazo Indonesia',
      isActive: true,
      isPrimary: false,
      isVerified: true,
    },
    {
      type: 'E_WALLET',
      walletType: 'DANA',
      phoneNumber: '081234567890',
      accountNumber: '081234567890',
      accountName: 'PT Plazo Indonesia',
      isActive: true,
      isPrimary: false,
      isVerified: true,
    },
  ];

  const created = await prisma.paymentAccount.createMany({
    data: accounts,
    skipDuplicates: true,
  });
  console.log(`✅ Payment accounts: ${created.count}`);
}

async function seedAdminUsers(password: string) {
  const users = [
    {
      email: "superadmin@plazo.id",
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
    },
    {
      email: "admin@plazo.id",
      firstName: "Admin",
      lastName: "Plazo",
      role: UserRole.ADMIN,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        role: user.role,
        isActive: true,
      },
      create: {
        email: user.email,
        password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: true,
        isActive: true,
        kycStatus: KycStatus.NOT_SUBMITTED,
      },
    });
    console.log(`✅ ${user.email} (${user.role})`);
  }
}

async function main() {
  console.log("Starting PRODUCTION seed...");
  console.log("");

  const password = await bcrypt.hash(PASSWORD, 10);

  await seedPlans();
  await seedCategories();
  await seedPlatformSettings();
  await seedPaymentAccounts();
  await seedAdminUsers(password);

  console.log("");
  console.log("Production seed completed.");
  console.log(`Admin password (dari SEED_ADMIN_PASSWORD): ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Production seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
