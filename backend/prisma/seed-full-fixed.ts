import { PrismaClient, UserRole, SubscriptionPlan, SellerTier, ProductType, JobStatus, ProposalStatus, OrderStatus, PaymentMethod, RatingType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Password default untuk semua user demo
const DEFAULT_PASSWORD = "Password@123";

// Helper functions
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

const image = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// ============================================
// DATA MASTER
// ============================================

const CITIES = [
  "Jakarta", "Bandung", "Surabaya", "Medan", "Semarang",
  "Makassar", "Palembang", "Tangerang", "Depok", "Bekasi",
  "Yogyakarta", "Malang", "Bogor", "Batam", "Pekanbaru",
  "Denpasar", "Balikpapan", "Samarinda", "Manado", "Solo"
];

const SKILLS = [
  "JavaScript", "TypeScript", "React", "Vue.js", "Angular",
  "Node.js", "Python", "PHP", "Laravel", "Django",
  "UI/UX Design", "Figma", "Adobe XD", "Photoshop", "Illustrator",
  "SEO", "Content Writing", "Social Media", "Video Editing", "3D Modeling"
];

const PRODUCT_DESCRIPTIONS = [
  "Produk berkualitas tinggi dengan garansi resmi. Sudah terbukti dan dipercaya oleh ribuan pelanggan.",
  "Kualitas premium dengan harga terjangkau. Cocok untuk kebutuhan sehari-hari maupun profesional.",
  "Desain modern dan elegan. Dibuat dengan material terbaik dan tahan lama.",
  "Produk original 100% dengan sertifikat keaslian. Gratis ongkir untuk pembelian hari ini!",
  "Best seller! Produk paling laris dan banyak diminati. Stok terbatas, buruan order!",
];

const SERVICE_DESCRIPTIONS = [
  "Layanan profesional dengan pengalaman bertahun-tahun. Hasil memuaskan dijamin!",
  "Fast response dan pengerjaan cepat. Revisi unlimited sampai puas.",
  "Harga bersahabat dengan kualitas terjamin. Sudah melayani ratusan klien puas.",
  "Paket lengkap dengan bonus konsultasi gratis. Garansi kepuasan 100%.",
  "Dikerjakan oleh tim ahli berpengalaman. Portfolio lengkap tersedia.",
];

const JOB_TITLES = [
  "Website Company Profile", "E-commerce Development", "Mobile App Development",
  "Logo Design", "Brand Identity Design", "UI/UX Design for Mobile App",
  "Content Writing for Blog", "SEO Optimization", "Social Media Management",
  "Video Editing for YouTube", "3D Product Visualization", "Landing Page Design"
];

const REVIEW_COMMENTS = [
  "Sangat puas dengan produk/layanan ini! Kualitas bagus dan sesuai deskripsi.",
  "Penjual responsif dan ramah. Pengiriman cepat. Recommended!",
  "Kualitas oke, harga worth it. Akan order lagi next time.",
  "Pelayanan memuaskan, hasil sesuai ekspektasi. Terima kasih!",
  "Fast response, pengerjaan cepat, hasil memuaskan. Top seller!",
  "Produk original dan berkualitas. Packaging rapi. Mantap!",
  "Seller profesional, komunikasi lancar. Highly recommended!",
  "Sesuai gambar, kualitas bagus. Puas banget!",
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log("🌱 Starting FULL comprehensive seed with all features...");

  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  // ============================================
  // 1. CATEGORIES
  // ============================================
  console.log("📁 Creating categories...");
  
  const categoriesData = [
    // Services
    { name: "Web Development", slug: "web-development", type: "SERVICE" },
    { name: "Mobile Apps", slug: "mobile-apps", type: "SERVICE" },
    { name: "UI/UX Design", slug: "ui-ux-design", type: "SERVICE" },
    { name: "Graphic Design", slug: "graphic-design", type: "SERVICE" },
    { name: "Digital Marketing", slug: "digital-marketing", type: "SERVICE" },
    { name: "Content Writing", slug: "content-writing", type: "SERVICE" },
    { name: "Video Editing", slug: "video-editing", type: "SERVICE" },
    { name: "SEO Services", slug: "seo-services", type: "SERVICE" },
    
    // Products
    { name: "Electronics", slug: "electronics", type: "PRODUCT" },
    { name: "Fashion", slug: "fashion", type: "PRODUCT" },
    { name: "Home & Living", slug: "home-living", type: "PRODUCT" },
    { name: "Books & Media", slug: "books-media", type: "PRODUCT" },
    { name: "Sports & Outdoor", slug: "sports-outdoor", type: "PRODUCT" },
    { name: "Beauty & Health", slug: "beauty-health", type: "PRODUCT" },
    { name: "Toys & Games", slug: "toys-games", type: "PRODUCT" },
    { name: "Automotive", slug: "automotive", type: "PRODUCT" },
  ];

  const categories = await Promise.all(
    categoriesData.map(cat =>
      prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: { ...cat, type: cat.type as any },
      })
    )
  );
  
  console.log(`✅ ${categories.length} categories`);

  // ============================================
  // 2. USERS (50 total)
  // ============================================
  console.log("👥 Creating users...");
  
  const usersData = [
    // Admins
    { email: "superadmin@plazo.com", firstName: "Super", lastName: "Admin", role: UserRole.SUPER_ADMIN },
    { email: "admin@plazo.com", firstName: "Admin", lastName: "Plazo", role: UserRole.ADMIN },
    
    // Buyers (20)
    ...Array.from({ length: 20 }, (_, i) => ({
      email: `buyer${i + 1}@plazo.com`,
      firstName: ["Ahmad", "Siti", "Budi", "Dewi", "Eko", "Fitri", "Gunawan", "Hani", "Indra", "Joko", "Kartika", "Lukman", "Maya", "Nanda", "Oki", "Putri", "Qori", "Rina", "Sandi", "Tari"][i],
      lastName: ["Wijaya", "Nurhaliza", "Santoso", "Lestari", "Prasetyo", "Handayani", "Susanto", "Rahmawati", "Kusuma", "Widodo", "Sari", "Hakim", "Angelina", "Pratama", "Setiawan", "Ayu", "Rahman", "Susanti", "Permana", "Wulandari"][i],
      role: UserRole.BUYER,
    })),
    
    // Sellers (30)
    ...Array.from({ length: 30 }, (_, i) => ({
      email: `seller${i + 1}@plazo.com`,
      firstName: ["Rizky", "Maya", "Dimas", "Anisa", "Fajar", "Naya", "Bima", "Raka", "Sinta", "Arif", "Lina", "Yoga", "Dina", "Hendra", "Wati", "Andi", "Lia", "Rudi", "Nina", "Bayu", "Citra", "Doni", "Eka", "Fani", "Gita", "Hadi", "Ika", "Jaya", "Kiki", "Luki"][i],
      lastName: ["Developer", "Designer", "Digital", "Content", "Studio", "Creative", "Tech", "Media", "Fashion", "Electronics", "Handmade", "Furniture", "Books", "Gadgets", "Kitchen", "Sports", "Beauty", "Automotive", "Kids", "Gaming", "Jewelry", "Music", "Art", "Craft", "Organic", "Tools", "Toys", "Pet", "Garden", "Office"][i],
      role: UserRole.SELLER,
    })),
  ];

  const users = await Promise.all(
    usersData.map(u =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          ...u,
          password: hashedPassword,
          isEmailVerified: true,
          isActive: true,
          phone: `08${randomInt(1000000000, 9999999999)}`,
          bio: `Hi, I'm ${u.firstName}!`,
        },
      })
    )
  );
  
  const sellers = users.filter(u => u.role === UserRole.SELLER);
  const buyers = users.filter(u => u.role === UserRole.BUYER);
  
  console.log(`✅ ${users.length} users (${sellers.length} sellers, ${buyers.length} buyers)`);

  // ============================================
  // 3. TENANTS (30 stores)
  // ============================================
  console.log("🏪 Creating tenants...");
  
  const tenants = await Promise.all(
    sellers.map(async (seller, i) => {
      const subdomain = `${seller.firstName.toLowerCase()}-${seller.lastName.toLowerCase()}`;
      const plans = [SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM, SubscriptionPlan.PROFESSIONAL];
      const plan = randomElement(plans);
      
      return prisma.tenant.upsert({
        where: { subdomain },
        update: {},
        create: {
          subdomain,
          name: `${seller.firstName} ${seller.lastName} Store`,
          description: `Welcome to ${seller.firstName}'s store! Quality products and services.`,
          ownerId: seller.id,
          subscriptionPlan: plan,
          sellerTier: plan === SubscriptionPlan.FREE ? SellerTier.FREE : SellerTier.MEMBER,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
          logo: image(`photo-${1500 + i}`),
          banner: image(`photo-${1600 + i}`),
          city: randomElement(CITIES),
        },
      });
    })
  );
  
  console.log(`✅ ${tenants.length} tenants`);

  // ============================================
  // 4. PRODUCTS (150 products)
  // ============================================
  console.log("📦 Creating products...");
  
  const productCategories = categories.filter(c => c.type === "PRODUCT");
  const products = [];
  
  for (let i = 0; i < 150; i++) {
    const tenant = randomElement(tenants);
    const category = randomElement(productCategories);
    const isDigital = Math.random() > 0.8;
    
    const name = `${category.name} Product ${i + 1}`;
    const price = randomInt(50000, 5000000);
    
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomInt(1000, 9999)}`,
        description: randomElement(PRODUCT_DESCRIPTIONS),
        price,
        comparePrice: Math.random() > 0.5 ? price + randomInt(10000, 500000) : undefined,
        stock: randomInt(10, 100),
        categoryId: category.id,
        images: [image(`photo-${2000 + i}`), image(`photo-${2100 + i}`), image(`photo-${2200 + i}`)],
        thumbnail: image(`photo-${2000 + i}`),
        tags: [category.name, "Quality", "Bestseller"],
        productType: isDigital ? ProductType.DIGITAL : ProductType.PHYSICAL,
        isDigital,
        isPublished: true,
        publishToMarketplace: Math.random() > 0.2,
        city: tenant.city,
      },
    });
    
    products.push(product);
  }
  
  console.log(`✅ ${products.length} products`);

  // ============================================
  // 5. SERVICES (80 services)
  // ============================================
  console.log("🛠️ Creating services...");
  
  const serviceCategories = categories.filter(c => c.type === "SERVICE");
  const services = [];
  
  for (let i = 0; i < 80; i++) {
    const tenant = randomElement(tenants);
    const category = randomElement(serviceCategories);
    
    const name = `${category.name} Service ${i + 1}`;
    const basePrice = randomInt(100000, 10000000);
    
    const service = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomInt(1000, 9999)}`,
        description: randomElement(SERVICE_DESCRIPTIONS),
        basePrice,
        comparePrice: Math.random() > 0.5 ? basePrice + randomInt(50000, 500000) : undefined,
        categoryId: category.id,
        thumbnail: image(`photo-${3000 + i}`),
        tags: [category.name, "Professional"],
        isPublished: true,
        publishToMarketplace: Math.random() > 0.2,
      },
    });
    
    services.push(service);
  }
  
  console.log(`✅ ${services.length} services`);

  // ============================================
  // 6. JOBS (50 jobs)
  // ============================================
  console.log("💼 Creating jobs...");
  
  const jobs = [];
  
  for (let i = 0; i < 50; i++) {
    const buyer = randomElement(buyers);
    const tenant = randomElement(tenants);
    const category = randomElement(serviceCategories);
    
    const statuses = [JobStatus.OPEN, JobStatus.IN_REVIEW, JobStatus.HIRED, JobStatus.COMPLETED];
    const status = randomElement(statuses);
    
    const job = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        buyerId: buyer.id,
        title: randomElement(JOB_TITLES),
        slug: `job-${i + 1}-${randomInt(1000, 9999)}`,
        description: `Looking for professional ${category.name} service. Budget negotiable. Please send your portfolio.`,
        budget: randomInt(500000, 10000000),
        categoryId: category.id,
        skills: randomElements(SKILLS, randomInt(3, 6)),
        attachments: [],
        status,
      },
    });
    
    jobs.push(job);
  }
  
  console.log(`✅ ${jobs.length} jobs`);

  // ============================================
  // 7. PROPOSALS (100 proposals)
  // ============================================
  console.log("📝 Creating proposals...");
  
  const proposals = [];
  
  for (let i = 0; i < 100; i++) {
    const job = randomElement(jobs);
    const seller = randomElement(sellers);
    
    const statuses = [ProposalStatus.PENDING, ProposalStatus.ACCEPTED, ProposalStatus.REJECTED, ProposalStatus.COMPLETED];
    const status = randomElement(statuses);
    
    const proposal = await prisma.proposal.create({
      data: {
        jobId: job.id,
        sellerId: seller.id,
        message: `I'm interested in your project. I have ${randomInt(2, 10)} years of experience in this field. Check my portfolio!`,
        proposedBudget: job.budget * (0.8 + Math.random() * 0.4),
        estimatedDuration: randomInt(3, 30),
        attachments: [],
        status,
      },
    });
    
    proposals.push(proposal);
  }
  
  console.log(`✅ ${proposals.length} proposals`);

  // ============================================
  // 8. ORDERS (200 orders)
  // ============================================
  console.log("🛒 Creating orders...");
  
  const orders = [];
  
  for (let i = 0; i < 200; i++) {
    const buyer = randomElement(buyers);
    const isProductOrder = Math.random() > 0.5;
    
    let orderData: any = {
      orderNumber: `ORD-${Date.now()}-${randomInt(1000, 9999)}`,
      buyerId: buyer.id,
      quantity: randomInt(1, 5),
      status: randomElement([
        OrderStatus.PENDING_PAYMENT,
        OrderStatus.PAYMENT_VERIFIED,
        OrderStatus.PROCESSING,
        OrderStatus.DELIVERED,
        OrderStatus.COMPLETED,
      ]),
      paymentMethod: randomElement([PaymentMethod.BANK_TRANSFER, PaymentMethod.E_WALLET]),
      notes: "Please pack carefully",
    };
    
    if (isProductOrder) {
      const product = randomElement(products);
      const tenant = tenants.find(t => t.id === product.tenantId)!;
      
      orderData = {
        ...orderData,
        tenantId: tenant.id,
        sellerId: tenant.ownerId,
        productId: product.id,
        amount: product.price * orderData.quantity,
      };
    } else {
      const service = randomElement(services);
      const tenant = tenants.find(t => t.id === service.tenantId)!;
      
      orderData = {
        ...orderData,
        tenantId: tenant.id,
        sellerId: tenant.ownerId,
        serviceId: service.id,
        amount: service.basePrice * orderData.quantity,
      };
    }
    
    const order = await prisma.order.create({ data: orderData });
    orders.push(order);
  }
  
  console.log(`✅ ${orders.length} orders`);

  // ============================================
  // 9. REVIEWS (150 reviews)
  // ============================================
  console.log("⭐ Creating reviews...");
  
  const completedOrders = orders.filter(o => o.status === OrderStatus.COMPLETED);
  const reviews = [];
  
  for (let i = 0; i < Math.min(150, completedOrders.length); i++) {
    const order = completedOrders[i];
    
    // Buyer reviews seller
    const buyerReview = await prisma.review.create({
      data: {
        orderId: order.id,
        giverId: order.buyerId,
        receiverId: order.sellerId,
        productId: order.productId,
        serviceId: order.serviceId,
        rating: randomInt(3, 5),
        comment: randomElement(REVIEW_COMMENTS),
        images: Math.random() > 0.7 ? [image(`photo-${4000 + i}`)] : [],
        type: RatingType.SELLER_RATING,
      },
    });
    
    reviews.push(buyerReview);
    
    // Seller reviews buyer (50% chance)
    if (Math.random() > 0.5) {
      const sellerReview = await prisma.review.create({
        data: {
          orderId: order.id,
          giverId: order.sellerId,
          receiverId: order.buyerId,
          rating: randomInt(4, 5),
          comment: "Great buyer! Fast payment and good communication.",
          images: [],
          type: RatingType.BUYER_RATING,
        },
      });
      
      reviews.push(sellerReview);
    }
  }
  
  console.log(`✅ ${reviews.length} reviews`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n✨ FULL COMPREHENSIVE SEED COMPLETED! ✨\n");
  console.log("📊 Summary:");
  console.log(`- Categories: ${categories.length}`);
  console.log(`- Users: ${users.length} (${sellers.length} sellers, ${buyers.length} buyers, 2 admins)`);
  console.log(`- Tenants/Stores: ${tenants.length}`);
  console.log(`- Products: ${products.length}`);
  console.log(`- Services: ${services.length}`);
  console.log(`- Jobs: ${jobs.length}`);
  console.log(`- Proposals: ${proposals.length}`);
  console.log(`- Orders: ${orders.length}`);
  console.log(`- Reviews: ${reviews.length}`);
  console.log("\n🔑 Login Credentials:");
  console.log(`Password for ALL users: ${DEFAULT_PASSWORD}`);
  console.log("\nExamples:");
  console.log("- Super Admin: superadmin@plazo.com");
  console.log("- Admin: admin@plazo.com");
  console.log("- Seller: seller1@plazo.com");
  console.log("- Buyer: buyer1@plazo.com");
  console.log("\n🚀 Ready to test all features!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
