import {
  BannerStatus,
  CategoryType,
  ChatTransactionStatus,
  CmsPageStatus,
  KycStatus,
  PackageTier,
  PaymentMethod,
  PrismaClient,
  ProductType,
  PromotionType,
  RatingType,
  RecommendedToolType,
  SellerLevel,
  SellerTier,
  StoreDisplayMode,
  SubscriptionPlan,
  Tenant,
  User,
  UserRole,
} from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const prisma = new PrismaClient();
const PASSWORD = "Password@123";

const demoEmails = [
  "superadmin@plazo.id",
  "admin@plazo.id",
  "buyer@plazo.id",
  "buyer1@plazo.id",
  "buyer2@plazo.id",
  "buyer3@plazo.id",
  "seller@plazo.id",
  "seller1@plazo.id",
  "seller2@plazo.id",
  "seller3@plazo.id",
  "seller4@plazo.id",
  "seller5@plazo.id",
  "naya@plazo.id",
  "bima@plazo.id",
  "raka@plazo.id",
];

const demoSubdomains = [
  "john-store",
  "rizky-dev",
  "maya-design",
  "dimas-digital",
  "anisa-content",
  "fajar-studio",
  "naya-studio",
  "bima-tech",
  "raka-content",
];

const image = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const addDays = (days: number) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function ignoreMissingTable(label: string, operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;

    if (code === "P2021") {
      console.log(`Skipping cleanup for missing table: ${label}`);
      return;
    }

    throw error;
  }
}

async function clearDemoData() {
  console.log("Cleaning old demo seed data...");

  const users = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true },
  });
  const tenants = await prisma.tenant.findMany({
    where: { subdomain: { in: demoSubdomains } },
    select: { id: true },
  });

  const userIds = users.map((user) => user.id);
  const tenantIds = tenants.map((tenant) => tenant.id);

  const products = await prisma.product.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true },
  });
  const services = await prisma.service.findMany({
    where: { tenantId: { in: tenantIds } },
    select: { id: true },
  });
  const jobs = await prisma.job.findMany({
    where: {
      OR: [{ tenantId: { in: tenantIds } }, { buyerId: { in: userIds } }],
    },
    select: { id: true },
  });
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { tenantId: { in: tenantIds } },
        { buyerId: { in: userIds } },
        { sellerId: { in: userIds } },
        { jobId: { in: jobs.map((job) => job.id) } },
      ],
    },
    select: { id: true },
  });
  const rooms = await prisma.chatRoom.findMany({
    where: {
      OR: [
        { tenantId: { in: tenantIds } },
        { orderId: { in: orders.map((order) => order.id) } },
        { participants: { some: { id: { in: userIds } } } },
      ],
    },
    select: { id: true },
  });
  const carts = await prisma.cart.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const variants = await prisma.productVariant.findMany({
    where: { productId: { in: products.map((product) => product.id) } },
    select: { id: true },
  });
  const paymentProofs = await prisma.paymentProof.findMany({
    where: {
      OR: [
        { orderId: { in: orders.map((order) => order.id) } },
        { uploadedBy: { in: userIds } },
        { verifiedBy: { in: userIds } },
      ],
    },
    select: { id: true },
  });
  const reviews = await prisma.review.findMany({
    where: {
      OR: [
        { giverId: { in: userIds } },
        { receiverId: { in: userIds } },
        { productId: { in: products.map((product) => product.id) } },
        { serviceId: { in: services.map((service) => service.id) } },
      ],
    },
    select: { id: true },
  });

  const productIds = products.map((product) => product.id);
  const serviceIds = services.map((service) => service.id);
  const jobIds = jobs.map((job) => job.id);
  const orderIds = orders.map((order) => order.id);
  const roomIds = rooms.map((room) => room.id);
  const cartIds = carts.map((cart) => cart.id);
  const variantIds = variants.map((variant) => variant.id);
  const paymentProofIds = paymentProofs.map((proof) => proof.id);
  const reviewIds = reviews.map((review) => review.id);

  await prisma.paymentVerificationLog.deleteMany({
    where: {
      OR: [
        { paymentProofId: { in: paymentProofIds } },
        { performedBy: { in: userIds } },
      ],
    },
  });
  await prisma.reviewReply.deleteMany({
    where: {
      OR: [{ reviewId: { in: reviewIds } }, { sellerId: { in: userIds } }],
    },
  });
  await prisma.chatTransaction.deleteMany({
    where: {
      OR: [
        { roomId: { in: roomIds } },
        { buyerId: { in: userIds } },
        { sellerId: { in: userIds } },
        { tenantId: { in: tenantIds } },
      ],
    },
  });
  await prisma.chatMessage.deleteMany({
    where: {
      OR: [{ roomId: { in: roomIds } }, { senderId: { in: userIds } }],
    },
  });
  await prisma.review.deleteMany({ where: { id: { in: reviewIds } } });
  await prisma.customOffer.deleteMany({
    where: {
      OR: [{ sellerId: { in: userIds } }, { buyerId: { in: userIds } }],
    },
  });
  await prisma.notification.deleteMany({
    where: {
      OR: [{ tenantId: { in: tenantIds } }, { userId: { in: userIds } }],
    },
  });
  await prisma.stockReservation.deleteMany({
    where: {
      OR: [
        { productId: { in: productIds } },
        { variantId: { in: variantIds } },
        { userId: { in: userIds } },
        { orderId: { in: orderIds } },
      ],
    },
  });
  await prisma.orderItem.deleteMany({
    where: {
      OR: [
        { orderId: { in: orderIds } },
        { productId: { in: productIds } },
        { variantId: { in: variantIds } },
      ],
    },
  });
  await prisma.cartItem.deleteMany({
    where: {
      OR: [
        { cartId: { in: cartIds } },
        { productId: { in: productIds } },
        { variantId: { in: variantIds } },
      ],
    },
  });
  await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.wishlist.deleteMany({
    where: {
      OR: [
        { userId: { in: userIds } },
        { productId: { in: productIds } },
        { serviceId: { in: serviceIds } },
      ],
    },
  });
  await prisma.flashSaleItem.deleteMany({
    where: {
      OR: [
        { productId: { in: productIds } },
        { serviceId: { in: serviceIds } },
        { tenantId: { in: tenantIds } },
      ],
    },
  });
  await prisma.flashSaleEvent.deleteMany({
    where: { name: { in: ["Plazo Launch Week", "Weekend Seller Spotlight"] } },
  });
  await prisma.paymentProof.deleteMany({
    where: {
      OR: [{ id: { in: paymentProofIds } }, { orderId: { in: orderIds } }],
    },
  });
  await prisma.dispute.deleteMany({
    where: {
      OR: [{ orderId: { in: orderIds } }, { openedById: { in: userIds } }],
    },
  });
  await prisma.orderDelivery.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderMilestone.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderActivity.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderCancellation.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderExtension.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.transaction.deleteMany({
    where: {
      OR: [{ userId: { in: userIds } }, { orderId: { in: orderIds } }],
    },
  });
  await prisma.withdrawal.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.proposal.deleteMany({
    where: {
      OR: [{ jobId: { in: jobIds } }, { sellerId: { in: userIds } }],
    },
  });
  await prisma.job.deleteMany({ where: { id: { in: jobIds } } });
  await prisma.chatRoom.deleteMany({ where: { id: { in: roomIds } } });
  await prisma.servicePackage.deleteMany({ where: { serviceId: { in: serviceIds } } });
  await prisma.service.deleteMany({ where: { id: { in: serviceIds } } });
  await prisma.productVariantOption.deleteMany({
    where: { variantId: { in: variantIds } },
  });
  await prisma.productVariant.deleteMany({ where: { id: { in: variantIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.shippingAddress.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.paymentAccount.deleteMany({
    where: {
      OR: [
        { tenantId: { in: tenantIds } },
        { accountNumber: { in: ["7001234567", "7007654321", "081200000700"] } },
      ],
    },
  });
  await ignoreMissingTable("AffiliateBonus", () =>
    prisma.affiliateBonus.deleteMany({
      where: {
        OR: [
          { affiliateUserId: { in: userIds } },
          { referredTenantId: { in: tenantIds } },
        ],
      },
    }),
  );
  await ignoreMissingTable("AffiliateClaim", () =>
    prisma.affiliateClaim.deleteMany({
      where: { affiliateUserId: { in: userIds } },
    }),
  );
  await ignoreMissingTable("SubscriptionPayment", () =>
    prisma.subscriptionPayment.deleteMany({
      where: {
        OR: [{ tenantId: { in: tenantIds } }, { affiliateUserId: { in: userIds } }],
      },
    }),
  );
  await prisma.subscription.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await ignoreMissingTable("SubscriptionHistory", () =>
    prisma.subscriptionHistory.deleteMany({
      where: { tenantId: { in: tenantIds } },
    }),
  );
  await ignoreMissingTable("Report", () =>
    prisma.report.deleteMany({
      where: {
        OR: [{ reporterId: { in: userIds } }, { targetUserId: { in: userIds } }],
      },
    }),
  );
  await ignoreMissingTable("FileUpload", () =>
    prisma.fileUpload.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await prisma.kycSubmission.deleteMany({ where: { userId: { in: userIds } } });
  await ignoreMissingTable("ActivityLog", () =>
    prisma.activityLog.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await ignoreMissingTable("AuditLog", () =>
    prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await prisma.storePage.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.sellerProfile.deleteMany({ where: { userId: { in: userIds } } });
  await ignoreMissingTable("AffiliateProfile", () =>
    prisma.affiliateProfile.deleteMany({ where: { userId: { in: userIds } } }),
  );
  await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  await prisma.cmsBanner.deleteMany({
    where: { title: { in: ["Jual Produk dan Jasa Digital", "Toko Premium Pilihan"] } },
  });
  await prisma.faqItem.deleteMany({
    where: { category: { in: ["general", "seller", "buyer", "subscription"] } },
  });
  await prisma.recommendedTool.deleteMany({
    where: {
      title: {
        in: [
          "Template Proposal Seller",
          "Checklist Optimasi Toko",
          "Canva",
          "Notion",
        ],
      },
    },
  });
}

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

  return plans.length;
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

  const result: Record<string, { id: string; slug: string }> = {};
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug_type: { slug: category.slug, type: category.type } },
      update: category,
      create: category,
      select: { id: true, slug: true },
    });
    result[saved.slug] = saved;
  }

  return result;
}

async function seedUsersAndStores(password: string) {
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@plazo.id",
      password,
      firstName: "Super",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      isEmailVerified: true,
      isActive: true,
      avatar: image("photo-1560250097-0b93528c311a", 300),
      bio: "Akun demo super admin Plazo.",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@plazo.id",
      password,
      firstName: "Admin",
      lastName: "Plazo",
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      avatar: image("photo-1494790108377-be9c29b29330", 300),
      bio: "Akun demo admin untuk moderasi marketplace.",
    },
  });

  const buyers = await Promise.all(
    [
      {
        email: "buyer1@plazo.id",
        firstName: "Alya",
        lastName: "Prameswari",
        phone: "081211110001",
        avatar: image("photo-1438761681033-6461ffad8d80", 300),
        bio: "Founder UMKM yang mencari seller untuk branding dan website.",
      },
      {
        email: "buyer2@plazo.id",
        firstName: "Dion",
        lastName: "Mahendra",
        phone: "081211110002",
        avatar: image("photo-1500648767791-00dcc994a43e", 300),
        bio: "Operator toko online yang sering membeli aset digital.",
      },
    ].map((buyer) =>
      prisma.user.create({
        data: {
          ...buyer,
          password,
          role: UserRole.BUYER,
          isEmailVerified: true,
          isActive: true,
        },
      }),
    ),
  );

  const sellerConfigs = [
    {
      email: "naya@plazo.id",
      firstName: "Naya",
      lastName: "Pradipta",
      phone: "081222220001",
      avatar: image("photo-1534528741775-53994a69daeb", 300),
      subdomain: "naya-studio",
      name: "Naya Studio",
      tagline: "Branding rapi untuk bisnis yang ingin naik kelas.",
      description:
        "Studio desain untuk brand identity, UI kit, template promosi, dan konsultasi visual.",
      city: "Bandung",
      plan: SubscriptionPlan.PREMIUM,
      level: SellerLevel.LEVEL_2,
      themeColor: "#2563EB",
      themeSecondary: "#F97316",
      skills: ["Brand Identity", "UI Design", "Figma", "Illustration"],
      website: "https://naya-studio.example.com",
      displayMode: StoreDisplayMode.LANDING_PAGE,
    },
    {
      email: "bima@plazo.id",
      firstName: "Bima",
      lastName: "Prasetyo",
      phone: "081222220002",
      avatar: image("photo-1507003211169-0a1dd7228f2d", 300),
      subdomain: "bima-tech",
      name: "Bima Tech Lab",
      tagline: "Website cepat, dashboard ringan, automasi jalan.",
      description:
        "Penyedia landing page, dashboard admin, integrasi payment, dan automasi operasional.",
      city: "Jakarta",
      plan: SubscriptionPlan.PROFESSIONAL,
      level: SellerLevel.TOP_RATED,
      themeColor: "#059669",
      themeSecondary: "#0F172A",
      skills: ["Next.js", "NestJS", "PostgreSQL", "Automation"],
      website: "https://bima-tech.example.com",
      displayMode: StoreDisplayMode.CATALOG,
    },
    {
      email: "raka@plazo.id",
      firstName: "Raka",
      lastName: "Wicaksana",
      phone: "081222220003",
      avatar: image("photo-1472099645785-5658abf4ff4e", 300),
      subdomain: "raka-content",
      name: "Raka Content Works",
      tagline: "Konten yang enak dibaca dan siap dikirim.",
      description:
        "Copywriting, artikel SEO, kalender konten, dan paket caption untuk brand lokal.",
      city: "Yogyakarta",
      plan: SubscriptionPlan.FREE,
      level: SellerLevel.LEVEL_1,
      themeColor: "#DC2626",
      themeSecondary: "#FACC15",
      skills: ["Copywriting", "SEO", "Content Planning", "Social Media"],
      website: null,
      displayMode: StoreDisplayMode.CATALOG,
    },
  ];

  const sellers: Array<{
    user: User;
    tenant: Tenant;
    config: (typeof sellerConfigs)[number];
  }> = [];

  for (let index = 0; index < sellerConfigs.length; index++) {
    const config = sellerConfigs[index];
    const seller = await prisma.user.create({
      data: {
        email: config.email,
        password,
        firstName: config.firstName,
        lastName: config.lastName,
        phone: config.phone,
        role: UserRole.SELLER,
        isEmailVerified: true,
        isActive: true,
        kycStatus:
          config.plan === SubscriptionPlan.FREE
            ? KycStatus.PENDING
            : KycStatus.APPROVED,
        kycVerifiedAt:
          config.plan === SubscriptionPlan.FREE ? null : addDays(-20),
        avatar: config.avatar,
        bio: config.description,
      },
    });

    await prisma.sellerProfile.create({
      data: {
        userId: seller.id,
        totalEarnings:
          config.plan === SubscriptionPlan.FREE
            ? 850000
            : config.plan === SubscriptionPlan.PREMIUM
              ? 18500000
              : 42600000,
        totalOrders:
          config.plan === SubscriptionPlan.FREE
            ? 6
            : config.plan === SubscriptionPlan.PREMIUM
              ? 54
              : 121,
        totalReviews:
          config.plan === SubscriptionPlan.FREE
            ? 5
            : config.plan === SubscriptionPlan.PREMIUM
              ? 45
              : 101,
        averageRating:
          config.plan === SubscriptionPlan.FREE
            ? 4.6
            : config.plan === SubscriptionPlan.PREMIUM
              ? 4.8
              : 4.9,
        level: config.level,
        bio: config.description,
        skills: config.skills,
        portfolio: `${config.name} portfolio`,
        portfolioFiles: ["/uploads/demo/portfolio-sample.pdf"],
        website: config.website,
        linkedin: "https://linkedin.com/company/plazo-demo",
      },
    });

    const isMember = config.plan !== SubscriptionPlan.FREE;
    const tenant: Tenant = await prisma.tenant.create({
      data: {
        ownerId: seller.id,
        subdomain: config.subdomain,
        name: config.name,
        tagline: config.tagline,
        description: config.description,
        logo: image("photo-1611224923853-80b023f02d71", 320),
        banner: image("photo-1497366754035-f200968a6e72", 1400),
        contactEmail: config.email,
        contactPhone: config.phone,
        contactWhatsapp: config.phone,
        address: `Jl. Demo Marketplace No. ${index + 10}`,
        city: config.city,
        subscriptionPlan: config.plan,
        sellerTier: isMember ? SellerTier.MEMBER : SellerTier.FREE,
        postsLimit: isMember ? 200 : 10,
        subscriptionExpiresAt: isMember ? addDays(60) : null,
        isActive: true,
        isVerified: isMember,
        verifiedAt: isMember ? addDays(-30) : null,
        isFeatured: config.plan === SubscriptionPlan.PROFESSIONAL,
        featuredOrder: config.plan === SubscriptionPlan.PROFESSIONAL ? 1 : null,
        themeColor: config.themeColor,
        themeSecondary: config.themeSecondary,
        themePreset: "modern",
        themeFontFamily: "inter",
        themeBorderRadius: "md",
        themeShadowStyle: "soft",
        socialLinks: {
          instagram: `https://instagram.com/${config.subdomain}`,
          website: config.website,
        },
        storeAnnouncement: isMember
          ? "Chat kami untuk konsultasi cepat sebelum order."
          : "Toko demo free tier: listing tampil di storefront seller.",
        displayMode: config.displayMode,
        metaTitle: `${config.name} - Plazo`,
        metaDescription: config.description,
        returnPolicy: "<p>Diskusikan revisi dan pengembalian langsung melalui chat.</p>",
        shippingPolicy: "<p>Produk digital dikirim melalui link, produk fisik mengikuti kurir seller.</p>",
        termsOfService: "<p>Buyer dan seller menyepakati scope pekerjaan melalui chat.</p>",
        privacyPolicy: "<p>Data kontak digunakan hanya untuk komunikasi transaksi.</p>",
        storeHours: {
          monday: { open: "09:00", close: "17:00", closed: false },
          friday: { open: "09:00", close: "16:00", closed: false },
          sunday: { closed: true },
        },
        canHighlightProducts: isMember,
        canPriorityListing: config.plan === SubscriptionPlan.PROFESSIONAL,
        canAnalyticsAdvanced: isMember,
      },
    });

    if (isMember) {
      await prisma.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: config.plan,
          monthlyPrice:
            config.plan === SubscriptionPlan.PROFESSIONAL ? 149000 : 99000,
          isActive: true,
          autoRenew: true,
          startDate: addDays(-30),
          endDate: addDays(60),
          renewalDate: addDays(30),
          lastPaymentAt: addDays(-30),
          lastPaymentAmount:
            config.plan === SubscriptionPlan.PROFESSIONAL ? 149000 : 99000,
          nextBillingDate: addDays(30),
          status: "active",
        },
      });
    }

    await prisma.storePage.createMany({
      data: [
        {
          tenantId: tenant.id,
          slug: "tentang",
          title: `Tentang ${config.name}`,
          excerpt: config.tagline,
          content: `<p>${config.description}</p>`,
          sortOrder: 1,
          isPublished: true,
        },
        {
          tenantId: tenant.id,
          slug: "cara-order",
          title: "Cara Order",
          excerpt: "Mulai dari chat, sepakati scope, lalu lanjutkan transaksi.",
          content:
            "<ol><li>Pilih produk atau jasa.</li><li>Klik chat seller.</li><li>Sepakati kebutuhan, harga, dan timeline.</li></ol>",
          sortOrder: 2,
          isPublished: true,
        },
      ],
    });

    await prisma.paymentAccount.create({
      data: {
        tenantId: tenant.id,
        type: PaymentMethod.BANK_TRANSFER,
        bankName: index === 0 ? "BCA" : index === 1 ? "Mandiri" : "BNI",
        accountNumber: `80000000${index + 1}`,
        accountName: `${config.firstName} ${config.lastName}`,
        isActive: true,
        isPrimary: true,
        isVerified: isMember,
        verifiedAt: isMember ? addDays(-15) : null,
      },
    });

    sellers.push({ user: seller, tenant, config });
  }

  return { superAdmin, admin, buyers, sellers };
}

async function seedListings(
  categories: Record<string, { id: string; slug: string }>,
  sellers: Awaited<ReturnType<typeof seedUsersAndStores>>["sellers"],
) {
  const naya = sellers[0];
  const bima = sellers[1];
  const raka = sellers[2];

  const digitalProduct = await prisma.product.create({
    data: {
      tenantId: naya.tenant.id,
      categoryId: categories["template-digital"].id,
      name: "Brand Starter Kit UMKM",
      slug: "brand-starter-kit-umkm",
      description:
        "Paket template logo usage, brand board, palet warna, typography guide, dan 24 template konten untuk peluncuran brand.",
      price: 179000,
      comparePrice: 249000,
      stock: 999,
      productType: ProductType.DIGITAL,
      isDigital: true,
      digitalFileUrl: "/uploads/demo/brand-starter-kit.zip",
      digitalFileName: "brand-starter-kit.zip",
      digitalFileSize: 25165824,
      downloadLimit: 5,
      downloadExpiry: 30,
      digitalDeliveryMethod: "FILE_DOWNLOAD",
      accessInstructions: "File dapat diunduh setelah seller mengirim link melalui chat.",
      images: [
        image("photo-1626785774573-4b799315345d"),
        image("photo-1609921212029-bb5a28e60960"),
      ],
      thumbnail: image("photo-1626785774573-4b799315345d", 500),
      tags: ["branding", "template", "canva", "umkm"],
      city: "Bandung",
      isBoosted: true,
      boostedUntil: addDays(14),
      isPublished: true,
      publishToMarketplace: true,
      metaTitle: "Brand Starter Kit UMKM",
      metaDescription: "Template branding siap pakai untuk bisnis kecil.",
    },
  });

  const physicalProduct = await prisma.product.create({
    data: {
      tenantId: naya.tenant.id,
      categoryId: categories["produk-fisik"].id,
      name: "Paket Stiker Packaging Premium",
      slug: "paket-stiker-packaging-premium",
      description:
        "Stiker label produk vinyl matte untuk packaging UMKM. Cocok untuk skincare, makanan, minuman, dan hampers.",
      price: 85000,
      comparePrice: 120000,
      stock: 120,
      productType: ProductType.PHYSICAL,
      isDigital: false,
      hasVariants: true,
      images: [
        image("photo-1586953208448-b95a79798f07"),
        image("photo-1607344645866-009c320b63e0"),
      ],
      thumbnail: image("photo-1586953208448-b95a79798f07", 500),
      tags: ["stiker", "packaging", "label"],
      city: "Bandung",
      isPublished: true,
      publishToMarketplace: true,
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: physicalProduct.id,
      sku: "STK-MATTE-50",
      name: "Matte - 50 pcs",
      price: 85000,
      stock: 60,
      sortOrder: 1,
      options: {
        create: [
          { optionName: "Finishing", optionValue: "Matte" },
          { optionName: "Jumlah", optionValue: "50 pcs" },
        ],
      },
    },
  });
  await prisma.productVariant.create({
    data: {
      productId: physicalProduct.id,
      sku: "STK-GLOSSY-100",
      name: "Glossy - 100 pcs",
      price: 149000,
      stock: 60,
      sortOrder: 2,
      options: {
        create: [
          { optionName: "Finishing", optionValue: "Glossy" },
          { optionName: "Jumlah", optionValue: "100 pcs" },
        ],
      },
    },
  });

  const appProduct = await prisma.product.create({
    data: {
      tenantId: bima.tenant.id,
      categoryId: categories["aplikasi-tools"].id,
      name: "Dashboard Sales Tracker",
      slug: "dashboard-sales-tracker",
      description:
        "Template dashboard spreadsheet dan automation script untuk memantau penjualan harian, channel, margin, dan stok cepat.",
      price: 299000,
      stock: 999,
      productType: ProductType.DIGITAL,
      isDigital: true,
      externalLink: "https://drive.google.com/demo-sales-tracker",
      digitalDeliveryMethod: "GOOGLE_DRIVE",
      accessInstructions: "Seller akan mengirim akses Google Drive setelah chat konfirmasi.",
      images: [image("photo-1460925895917-afdab827c52f")],
      thumbnail: image("photo-1460925895917-afdab827c52f", 500),
      tags: ["dashboard", "spreadsheet", "automation"],
      city: "Jakarta",
      isBoosted: true,
      boostedUntil: addDays(7),
      isPublished: true,
      publishToMarketplace: true,
    },
  });

  const freeTierProduct = await prisma.product.create({
    data: {
      tenantId: raka.tenant.id,
      categoryId: categories["template-digital"].id,
      name: "Kalender Konten Mini",
      slug: "kalender-konten-mini",
      description:
        "Template kalender konten 14 hari untuk Instagram, cocok untuk seller pemula yang ingin konsisten posting.",
      price: 49000,
      stock: 999,
      productType: ProductType.DIGITAL,
      isDigital: true,
      externalLink: "https://drive.google.com/demo-content-calendar",
      digitalDeliveryMethod: "EXTERNAL_LINK",
      images: [image("photo-1455390582262-044cdead277a")],
      thumbnail: image("photo-1455390582262-044cdead277a", 500),
      tags: ["content", "template", "instagram"],
      city: "Yogyakarta",
      isPublished: true,
      publishToMarketplace: false,
    },
  });

  const designService = await prisma.service.create({
    data: {
      tenantId: naya.tenant.id,
      categoryId: categories["desain-branding"].id,
      name: "Desain Brand Identity untuk UMKM",
      slug: "desain-brand-identity-umkm",
      description:
        "Paket desain identitas visual dari logo, warna, font, sampai template konten. Cocok untuk brand baru atau rebranding ringan.",
      basePrice: 750000,
      comparePrice: 950000,
      thumbnail: image("photo-1561070791-2526d30994b5", 500),
      gallery: [image("photo-1545235617-7a424c1a60cc"), image("photo-1558655146-9f40138edfeb")],
      tags: ["logo", "branding", "brand guideline"],
      city: "Bandung",
      faq: [
        { question: "Apakah termasuk source file?", answer: "Ya, untuk paket Standard dan Premium." },
        { question: "Bisa revisi?", answer: "Bisa sesuai jumlah revisi tiap paket." },
      ],
      isBoosted: true,
      boostedUntil: addDays(14),
      isPublished: true,
      publishToMarketplace: true,
    },
  });

  await prisma.servicePackage.createMany({
    data: [
      {
        serviceId: designService.id,
        tier: PackageTier.BASIC,
        title: "Logo Basic",
        description: "1 konsep logo, file PNG, dan 1 revisi.",
        price: 750000,
        deliveryDays: 4,
        revisions: 1,
        features: ["1 konsep", "PNG transparan", "1 revisi"],
      },
      {
        serviceId: designService.id,
        tier: PackageTier.STANDARD,
        title: "Brand Kit",
        description: "2 konsep logo, palet warna, typography, dan source file.",
        price: 1500000,
        deliveryDays: 7,
        revisions: 3,
        features: ["2 konsep", "Source file", "Brand board", "3 revisi"],
      },
      {
        serviceId: designService.id,
        tier: PackageTier.PREMIUM,
        title: "Full Brand Identity",
        description: "Logo, guideline ringkas, dan 12 template sosial media.",
        price: 2800000,
        deliveryDays: 12,
        revisions: 5,
        features: ["Brand guideline", "12 template", "Priority chat", "5 revisi"],
      },
    ],
  });

  const websiteService = await prisma.service.create({
    data: {
      tenantId: bima.tenant.id,
      categoryId: categories["website-automasi"].id,
      name: "Landing Page Cepat untuk Campaign",
      slug: "landing-page-cepat-campaign",
      description:
        "Pembuatan landing page responsif dengan form lead, tracking pixel, dan setup deploy. Flow utama dimulai dari chat scope kebutuhan.",
      basePrice: 1200000,
      thumbnail: image("photo-1547658719-da2b51169166", 500),
      gallery: [image("photo-1498050108023-c5249f4df085"), image("photo-1555066931-4365d14bab8c")],
      tags: ["landing page", "nextjs", "campaign"],
      city: "Jakarta",
      faq: [{ question: "Apakah termasuk hosting?", answer: "Termasuk setup deploy, biaya hosting pihak ketiga ditanggung buyer." }],
      isPublished: true,
      publishToMarketplace: true,
    },
  });

  await prisma.servicePackage.createMany({
    data: [
      {
        serviceId: websiteService.id,
        tier: PackageTier.BASIC,
        title: "One Page",
        description: "Landing page 1 halaman dengan form kontak.",
        price: 1200000,
        deliveryDays: 5,
        revisions: 1,
        features: ["1 halaman", "Responsive", "Form kontak"],
      },
      {
        serviceId: websiteService.id,
        tier: PackageTier.STANDARD,
        title: "Campaign Ready",
        description: "Landing page dengan tracking pixel dan copy section lengkap.",
        price: 2500000,
        deliveryDays: 8,
        revisions: 3,
        features: ["Tracking pixel", "SEO basic", "Deploy"],
      },
      {
        serviceId: websiteService.id,
        tier: PackageTier.PREMIUM,
        title: "Conversion Suite",
        description: "Landing page plus A/B copy, analytics, dan integrasi spreadsheet.",
        price: 4500000,
        deliveryDays: 14,
        revisions: 5,
        features: ["A/B section", "Analytics", "Integrasi spreadsheet"],
      },
    ],
  });

  const contentService = await prisma.service.create({
    data: {
      tenantId: raka.tenant.id,
      categoryId: categories["konten-marketing"].id,
      name: "Paket Caption 30 Hari",
      slug: "paket-caption-30-hari",
      description:
        "Caption Instagram 30 hari dengan angle konten edukasi, promosi, dan engagement untuk bisnis lokal.",
      basePrice: 350000,
      thumbnail: image("photo-1488190211105-8b0e65b80b4e", 500),
      gallery: [image("photo-1455390582262-044cdead277a")],
      tags: ["caption", "copywriting", "instagram"],
      city: "Yogyakarta",
      isPublished: true,
      publishToMarketplace: false,
    },
  });

  await prisma.servicePackage.create({
    data: {
      serviceId: contentService.id,
      tier: PackageTier.BASIC,
      title: "30 Caption",
      description: "30 caption pendek dengan CTA.",
      price: 350000,
      deliveryDays: 5,
      revisions: 1,
      features: ["30 caption", "CTA", "1 revisi"],
    },
  });

  return {
    products: [digitalProduct, physicalProduct, appProduct, freeTierProduct],
    services: [designService, websiteService, contentService],
  };
}

async function seedInteractions(
  categories: Record<string, { id: string; slug: string }>,
  users: Awaited<ReturnType<typeof seedUsersAndStores>>,
  listings: Awaited<ReturnType<typeof seedListings>>,
) {
  const [buyerA, buyerB] = users.buyers;
  const [naya, bima] = users.sellers;
  const [brandKit, , salesTracker] = listings.products;
  const [designService, websiteService] = listings.services;

  await prisma.shippingAddress.createMany({
    data: [
      {
        userId: buyerA.id,
        label: "Rumah",
        name: "Alya Prameswari",
        phone: "081211110001",
        address: "Jl. Merdeka No. 21",
        province: "DKI Jakarta",
        city: "Jakarta Selatan",
        district: "Kebayoran Baru",
        postalCode: "12130",
        isDefault: true,
      },
      {
        userId: buyerB.id,
        label: "Kantor",
        name: "Dion Mahendra",
        phone: "081211110002",
        address: "Jl. Braga No. 7",
        province: "Jawa Barat",
        city: "Bandung",
        district: "Sumur Bandung",
        postalCode: "40111",
        isDefault: true,
      },
    ],
  });

  const job = await prisma.job.create({
    data: {
      tenantId: bima.tenant.id,
      buyerId: buyerA.id,
      categoryId: categories["website-automasi"].id,
      title: "Butuh automasi laporan marketplace mingguan",
      slug: "automasi-laporan-marketplace-mingguan",
      description:
        "Saya butuh script untuk menarik data penjualan dari spreadsheet, membuat ringkasan mingguan, dan mengirim report ke email tim.",
      budget: 3500000,
      tags: ["automation", "spreadsheet", "reporting"],
      maxProposals: 10,
      city: "Jakarta",
      status: "OPEN",
      isBoosted: true,
      boostedUntil: addDays(7),
    },
  });

  await prisma.proposal.create({
    data: {
      jobId: job.id,
      sellerId: bima.user.id,
      bidPrice: 3200000,
      message:
        "Saya bisa bantu buat flow otomatis dengan Google Apps Script, template report, dan dokumentasi singkat untuk tim.",
      attachments: ["/uploads/demo/proposal-automation.pdf"],
      status: "PENDING",
    },
  });

  const room = await prisma.chatRoom.create({
    data: {
      tenantId: naya.tenant.id,
      contextType: "product",
      contextId: brandKit.id,
      contextTitle: brandKit.name,
      participants: {
        connect: [{ id: buyerA.id }, { id: naya.user.id }],
      },
      messages: {
        create: [
          {
            senderId: buyerA.id,
            text: "Halo, template brand kit ini bisa dipakai untuk Canva?",
            attachments: [],
            isRead: true,
            readAt: addDays(-2),
          },
          {
            senderId: naya.user.id,
            text: "Bisa. File demo ini berisi link Canva dan aset PNG untuk kebutuhan cepat.",
            attachments: [],
            isRead: true,
            readAt: addDays(-2),
          },
        ],
      },
    },
  });

  const chatTransaction = await prisma.chatTransaction.create({
    data: {
      roomId: room.id,
      buyerId: buyerA.id,
      sellerId: naya.user.id,
      tenantId: naya.tenant.id,
      contextType: "product",
      contextId: brandKit.id,
      contextTitle: brandKit.name,
      quantity: 1,
      price: brandKit.price,
      status: ChatTransactionStatus.COMPLETED,
      completedAt: addDays(-1),
      completedBy: naya.user.id,
    },
  });

  const review = await prisma.review.create({
    data: {
      productId: brandKit.id,
      giverId: buyerA.id,
      receiverId: naya.user.id,
      rating: 5,
      comment:
        "Template rapi, mudah diedit, dan seller cepat menjawab pertanyaan sebelum transaksi.",
      images: [],
      type: RatingType.SELLER_RATING,
      communicationRating: 5,
      serviceRating: 5,
      recommendRating: 5,
      isVerified: true,
      isPublic: true,
    },
  });

  await prisma.chatTransaction.update({
    where: { id: chatTransaction.id },
    data: { reviewId: review.id },
  });
  await prisma.reviewReply.create({
    data: {
      reviewId: review.id,
      sellerId: naya.user.id,
      message: "Terima kasih, semoga brand kit-nya membantu launch campaign.",
    },
  });

  await prisma.review.createMany({
    data: [
      {
        serviceId: designService.id,
        giverId: buyerB.id,
        receiverId: naya.user.id,
        rating: 5,
        comment: "Proses diskusi jelas dan hasil desain sesuai brief.",
        images: [],
        type: RatingType.SELLER_RATING,
        communicationRating: 5,
        serviceRating: 5,
        recommendRating: 5,
        isVerified: false,
        isPublic: true,
      },
      {
        productId: salesTracker.id,
        giverId: buyerB.id,
        receiverId: bima.user.id,
        rating: 4,
        comment: "Dashboard langsung kepakai, dokumentasinya cukup mudah diikuti.",
        images: [],
        type: RatingType.SELLER_RATING,
        communicationRating: 4,
        serviceRating: 5,
        recommendRating: 4,
        isVerified: true,
        isPublic: true,
      },
      {
        serviceId: websiteService.id,
        giverId: buyerA.id,
        receiverId: bima.user.id,
        rating: 5,
        comment: "Landing page cepat dan tracking campaign langsung aktif.",
        images: [],
        type: RatingType.SELLER_RATING,
        communicationRating: 5,
        serviceRating: 5,
        recommendRating: 5,
        isVerified: false,
        isPublic: true,
      },
    ],
  });

  const cart = await prisma.cart.create({ data: { userId: buyerB.id } });
  await prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: salesTracker.id,
      quantity: 1,
    },
  });

  await prisma.wishlist.createMany({
    data: [
      { userId: buyerA.id, productId: brandKit.id },
      { userId: buyerA.id, serviceId: websiteService.id },
      { userId: buyerB.id, productId: salesTracker.id },
      { userId: buyerB.id, serviceId: designService.id },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        tenantId: naya.tenant.id,
        userId: naya.user.id,
        title: "Chat baru dari buyer",
        message: "Alya menanyakan Brand Starter Kit UMKM.",
        type: "chat",
        referenceId: room.id,
        referenceType: "chat",
        metadata: { contextType: "product", contextTitle: brandKit.name },
      },
      {
        tenantId: bima.tenant.id,
        userId: bima.user.id,
        title: "Proposal terkirim",
        message: "Proposal untuk automasi laporan marketplace sudah terkirim.",
        type: "proposal",
        referenceId: job.id,
        referenceType: "job",
        isRead: true,
        readAt: addDays(-1),
      },
    ],
  });
}

async function seedPlatformContent(superAdminId: string) {
  await prisma.paymentAccount.createMany({
    data: [
      {
        type: PaymentMethod.BANK_TRANSFER,
        bankName: "BCA",
        accountNumber: "7001234567",
        accountName: "PT Plazo Indonesia",
        isActive: true,
        isPrimary: true,
        isVerified: true,
        verifiedAt: addDays(-60),
      },
      {
        type: PaymentMethod.BANK_TRANSFER,
        bankName: "Mandiri",
        accountNumber: "7007654321",
        accountName: "PT Plazo Indonesia",
        isActive: true,
        isPrimary: false,
        isVerified: true,
        verifiedAt: addDays(-60),
      },
      {
        type: PaymentMethod.E_WALLET,
        walletType: "DANA",
        phoneNumber: "081200000700",
        accountNumber: "081200000700",
        accountName: "PT Plazo Indonesia",
        isActive: true,
        isPrimary: false,
        isVerified: true,
        verifiedAt: addDays(-60),
      },
    ],
  });

  await prisma.cmsPage.upsert({
    where: { slug: "tentang-plazo" },
    update: {
      title: "Tentang Plazo",
      status: CmsPageStatus.PUBLISHED,
      content:
        "<p>Plazo adalah marketplace untuk produk, jasa, toko seller, dan komunikasi langsung antara buyer dan seller.</p>",
      publishedAt: addDays(-10),
    },
    create: {
      slug: "tentang-plazo",
      title: "Tentang Plazo",
      excerpt: "Marketplace produk dan jasa dengan storefront seller.",
      content:
        "<p>Plazo adalah marketplace untuk produk, jasa, toko seller, dan komunikasi langsung antara buyer dan seller.</p>",
      status: CmsPageStatus.PUBLISHED,
      isInNavigation: true,
      sortOrder: 1,
      createdBy: superAdminId,
      publishedAt: addDays(-10),
    },
  });

  await prisma.cmsPage.upsert({
    where: { slug: "panduan-seller" },
    update: {
      title: "Panduan Seller",
      status: CmsPageStatus.PUBLISHED,
      content:
        "<p>Lengkapi profil toko, upload produk atau jasa, aktifkan fitur membership, dan respon chat buyer dengan cepat.</p>",
      publishedAt: addDays(-8),
    },
    create: {
      slug: "panduan-seller",
      title: "Panduan Seller",
      excerpt: "Langkah cepat mulai berjualan di Plazo.",
      content:
        "<p>Lengkapi profil toko, upload produk atau jasa, aktifkan fitur membership, dan respon chat buyer dengan cepat.</p>",
      status: CmsPageStatus.PUBLISHED,
      isInNavigation: true,
      sortOrder: 2,
      createdBy: superAdminId,
      publishedAt: addDays(-8),
    },
  });

  await prisma.cmsBanner.createMany({
    data: [
      {
        title: "Jual Produk dan Jasa Digital",
        subtitle: "Bangun toko, tampil di marketplace, lalu mulai percakapan dengan buyer.",
        imageUrl: image("photo-1556761175-b413da4baf72", 1600),
        linkUrl: "/products",
        status: BannerStatus.ACTIVE,
        position: "homepage_hero",
        sortOrder: 1,
        createdBy: superAdminId,
      },
      {
        title: "Toko Premium Pilihan",
        subtitle: "Seller member mendapat badge, highlight listing, dan akses tools rekomendasi.",
        imageUrl: image("photo-1522071820081-009f0129c71c", 1600),
        linkUrl: "/services",
        status: BannerStatus.ACTIVE,
        position: "homepage_secondary",
        sortOrder: 2,
        createdBy: superAdminId,
      },
    ],
  });

  await prisma.siteSetting.upsert({
    where: { key: "site_name" },
    update: { value: "Plazo" },
    create: {
      key: "site_name",
      value: "Plazo",
      group: "general",
      description: "Nama platform",
      updatedBy: superAdminId,
    },
  });
  await prisma.siteSetting.upsert({
    where: { key: "site_description" },
    update: { value: "Marketplace produk dan jasa untuk seller Indonesia." },
    create: {
      key: "site_description",
      value: "Marketplace produk dan jasa untuk seller Indonesia.",
      group: "seo",
      description: "Deskripsi SEO default",
      updatedBy: superAdminId,
    },
  });
  await prisma.siteSetting.upsert({
    where: { key: "support_email" },
    update: { value: "support@plazo.id" },
    create: {
      key: "support_email",
      value: "support@plazo.id",
      group: "general",
      description: "Email support",
      updatedBy: superAdminId,
    },
  });

  await prisma.faqItem.createMany({
    data: [
      {
        question: "Apakah transaksi wajib lewat order internal?",
        answer:
          "Tidak. Flow utama saat ini adalah buyer menghubungi seller lewat chat untuk menyepakati kebutuhan dan cara transaksi.",
        category: "buyer",
        sortOrder: 1,
      },
      {
        question: "Apa beda seller free dan member?",
        answer:
          "Seller free memiliki storefront dasar. Seller member bisa publish ke marketplace utama, mendapat badge, dan membuka fitur premium sesuai plan.",
        category: "subscription",
        sortOrder: 2,
      },
      {
        question: "Apakah produk digital didukung?",
        answer:
          "Ya. Produk digital dapat memakai file download, external link, Google Drive, license key, atau instruksi manual.",
        category: "seller",
        sortOrder: 3,
      },
    ],
  });

  await prisma.promotion.upsert({
    where: { code: "LAUNCH25" },
    update: {
      isActive: true,
      startDate: addDays(-7),
      endDate: addDays(30),
    },
    create: {
      code: "LAUNCH25",
      name: "Launch Discount 25%",
      description: "Promo demo untuk produk dan jasa terpilih.",
      type: PromotionType.PERCENTAGE,
      value: 25,
      minOrderAmount: 50000,
      maxDiscount: 150000,
      usageLimit: 500,
      perUserLimit: 1,
      applicableTo: "all",
      isActive: true,
      startDate: addDays(-7),
      endDate: addDays(30),
      createdBy: superAdminId,
    },
  });

  await prisma.recommendedTool.createMany({
    data: [
      {
        title: "Template Proposal Seller",
        description:
          "Template PDF untuk membuat penawaran profesional setelah buyer membuka chat.",
        type: RecommendedToolType.EBOOK_PDF,
        fileUrl: "/uploads/demo/template-proposal-seller.pdf",
        fileName: "template-proposal-seller.pdf",
        fileSize: 3145728,
        thumbnail: image("photo-1454165804606-c3d57bc86b40", 500),
        isActive: true,
        sortOrder: 1,
        createdBy: superAdminId,
      },
      {
        title: "Checklist Optimasi Toko",
        description:
          "Checklist untuk memperbaiki profil toko, deskripsi produk, SEO, dan response chat.",
        type: RecommendedToolType.EBOOK_PDF,
        fileUrl: "/uploads/demo/checklist-optimasi-toko.pdf",
        fileName: "checklist-optimasi-toko.pdf",
        fileSize: 2097152,
        thumbnail: image("photo-1432888498266-38ffec3eaf0a", 500),
        isActive: true,
        sortOrder: 2,
        createdBy: superAdminId,
      },
      {
        title: "Canva",
        description: "Tool desain cepat untuk membuat thumbnail, banner toko, dan materi campaign.",
        type: RecommendedToolType.WEBSITE,
        redirectUrl: "https://www.canva.com",
        thumbnail: image("photo-1611532736597-de2d4265fba3", 500),
        isActive: true,
        sortOrder: 3,
        createdBy: superAdminId,
      },
      {
        title: "Notion",
        description: "Workspace untuk brief buyer, knowledge base, dan tracking pekerjaan.",
        type: RecommendedToolType.APPLICATION,
        redirectUrl: "https://www.notion.so",
        thumbnail: image("photo-1531403009284-440f080d1e12", 500),
        isActive: true,
        sortOrder: 4,
        createdBy: superAdminId,
      },
    ],
  });
}

async function seedKyc(sellers: Awaited<ReturnType<typeof seedUsersAndStores>>["sellers"]) {
  for (const seller of sellers) {
    await prisma.kycSubmission.create({
      data: {
        userId: seller.user.id,
        ktpNumberHash: crypto
          .createHash("sha256")
          .update(`demo-${seller.user.email}`)
          .digest("hex"),
        ktpNumberEncrypted: "demo-encrypted-ktp",
        fullNameEncrypted: "demo-encrypted-name",
        addressEncrypted: "demo-encrypted-address",
        dobEncrypted: "demo-encrypted-dob",
        ktpPhotoPath: `/secure/demo/${seller.user.id}-ktp.jpg`,
        selfieWithKtpPath: `/secure/demo/${seller.user.id}-selfie.jpg`,
        status:
          seller.tenant.sellerTier === SellerTier.FREE
            ? KycStatus.PENDING
            : KycStatus.APPROVED,
        verifiedBy:
          seller.tenant.sellerTier === SellerTier.FREE ? null : "system-seed",
        verifiedAt:
          seller.tenant.sellerTier === SellerTier.FREE ? null : addDays(-20),
        ipAddress: "127.0.0.1",
      },
    });
  }
}

async function main() {
  console.log("Starting Plazo seed...");

  await clearDemoData();

  const password = await bcrypt.hash(PASSWORD, 10);
  const planCount = await seedPlans();
  const categories = await seedCategories();
  const users = await seedUsersAndStores(password);
  const listings = await seedListings(categories, users.sellers);

  await seedInteractions(categories, users, listings);
  await seedKyc(users.sellers);
  await seedPlatformContent(users.superAdmin.id);

  console.log("");
  console.log("Seed completed.");
  console.log(`Plans: ${planCount}`);
  console.log(`Categories: ${Object.keys(categories).length}`);
  console.log(`Users: ${2 + users.buyers.length + users.sellers.length}`);
  console.log(`Stores: ${users.sellers.length}`);
  console.log(`Products: ${listings.products.length}`);
  console.log(`Services: ${listings.services.length}`);
  console.log("");
  console.log(`All demo accounts use password: ${PASSWORD}`);
  console.log("superadmin@plazo.id");
  console.log("admin@plazo.id");
  console.log("buyer1@plazo.id");
  console.log("buyer2@plazo.id");
  console.log("naya@plazo.id");
  console.log("bima@plazo.id");
  console.log("raka@plazo.id");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
