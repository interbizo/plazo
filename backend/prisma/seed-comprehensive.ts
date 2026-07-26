import { PrismaClient, UserRole, SubscriptionPlan, SellerTier, ProductType } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Password default untuk semua user demo
const DEFAULT_PASSWORD = "Password@123";

// Helper function untuk hash password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Helper function untuk generate random date
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function untuk random number
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function untuk random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Unsplash image helper
const image = (id: string, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

// ============================================
// DATA MASTER
// ============================================

const CITIES = [
  "Jakarta", "Bandung", "Surabaya", "Medan", "Semarang",
  "Makassar", "Palembang", "Tangerang", "Depok", "Bekasi",
  "Yogyakarta", "Malang", "Bogor", "Batam", "Pekanbaru"
];

const CATEGORIES_DATA = [
  // Technology & Digital
  { name: "Web Development", slug: "web-development", type: "SERVICE" },
  { name: "Mobile Apps", slug: "mobile-apps", type: "SERVICE" },
  { name: "UI/UX Design", slug: "ui-ux-design", type: "SERVICE" },
  { name: "Graphic Design", slug: "graphic-design", type: "SERVICE" },
  { name: "Digital Marketing", slug: "digital-marketing", type: "SERVICE" },
  { name: "SEO Services", slug: "seo-services", type: "SERVICE" },
  { name: "Content Writing", slug: "content-writing", type: "SERVICE" },
  { name: "Video Editing", slug: "video-editing", type: "SERVICE" },
  
  // Products - Electronics
  { name: "Laptops & Computers", slug: "laptops-computers", type: "PRODUCT" },
  { name: "Smartphones", slug: "smartphones", type: "PRODUCT" },
  { name: "Cameras", slug: "cameras", type: "PRODUCT" },
  { name: "Audio Equipment", slug: "audio-equipment", type: "PRODUCT" },
  
  // Products - Fashion
  { name: "Men's Fashion", slug: "mens-fashion", type: "PRODUCT" },
  { name: "Women's Fashion", slug: "womens-fashion", type: "PRODUCT" },
  { name: "Accessories", slug: "accessories", type: "PRODUCT" },
  
  // Products - Home & Living
  { name: "Furniture", slug: "furniture", type: "PRODUCT" },
  { name: "Home Decor", slug: "home-decor", type: "PRODUCT" },
  { name: "Kitchen & Dining", slug: "kitchen-dining", type: "PRODUCT" },
  
  // Digital Products
  { name: "E-books", slug: "ebooks", type: "PRODUCT" },
  { name: "Online Courses", slug: "online-courses", type: "PRODUCT" },
  { name: "Software & Apps", slug: "software-apps", type: "PRODUCT" },
  { name: "Templates & Themes", slug: "templates-themes", type: "PRODUCT" },
];

const USERS_DATA = [
  // Super Admin
  { email: "superadmin@plazo.com", firstName: "Super", lastName: "Admin", role: UserRole.SUPER_ADMIN },
  { email: "admin@plazo.com", firstName: "Admin", lastName: "Plazo", role: UserRole.ADMIN },
  
  // Buyers (20 buyers)
  { email: "buyer1@plazo.com", firstName: "Ahmad", lastName: "Wijaya", role: UserRole.BUYER },
  { email: "buyer2@plazo.com", firstName: "Siti", lastName: "Nurhaliza", role: UserRole.BUYER },
  { email: "buyer3@plazo.com", firstName: "Budi", lastName: "Santoso", role: UserRole.BUYER },
  { email: "buyer4@plazo.com", firstName: "Dewi", lastName: "Lestari", role: UserRole.BUYER },
  { email: "buyer5@plazo.com", firstName: "Eko", lastName: "Prasetyo", role: UserRole.BUYER },
  { email: "buyer6@plazo.com", firstName: "Fitri", lastName: "Handayani", role: UserRole.BUYER },
  { email: "buyer7@plazo.com", firstName: "Gunawan", lastName: "Susanto", role: UserRole.BUYER },
  { email: "buyer8@plazo.com", firstName: "Hani", lastName: "Rahmawati", role: UserRole.BUYER },
  { email: "buyer9@plazo.com", firstName: "Indra", lastName: "Kusuma", role: UserRole.BUYER },
  { email: "buyer10@plazo.com", firstName: "Joko", lastName: "Widodo", role: UserRole.BUYER },
  { email: "buyer11@plazo.com", firstName: "Kartika", lastName: "Sari", role: UserRole.BUYER },
  { email: "buyer12@plazo.com", firstName: "Lukman", lastName: "Hakim", role: UserRole.BUYER },
  { email: "buyer13@plazo.com", firstName: "Maya", lastName: "Angelina", role: UserRole.BUYER },
  { email: "buyer14@plazo.com", firstName: "Nanda", lastName: "Pratama", role: UserRole.BUYER },
  { email: "buyer15@plazo.com", firstName: "Oki", lastName: "Setiawan", role: UserRole.BUYER },
  { email: "buyer16@plazo.com", firstName: "Putri", lastName: "Ayu", role: UserRole.BUYER },
  { email: "buyer17@plazo.com", firstName: "Qori", lastName: "Rahman", role: UserRole.BUYER },
  { email: "buyer18@plazo.com", firstName: "Rina", lastName: "Susanti", role: UserRole.BUYER },
  { email: "buyer19@plazo.com", firstName: "Sandi", lastName: "Permana", role: UserRole.BUYER },
  { email: "buyer20@plazo.com", firstName: "Tari", lastName: "Wulandari", role: UserRole.BUYER },
  
  // Sellers (30 sellers)
  { email: "seller1@plazo.com", firstName: "Rizky", lastName: "Developer", role: UserRole.SELLER },
  { email: "seller2@plazo.com", firstName: "Maya", lastName: "Designer", role: UserRole.SELLER },
  { email: "seller3@plazo.com", firstName: "Dimas", lastName: "Digital", role: UserRole.SELLER },
  { email: "seller4@plazo.com", firstName: "Anisa", lastName: "Content", role: UserRole.SELLER },
  { email: "seller5@plazo.com", firstName: "Fajar", lastName: "Studio", role: UserRole.SELLER },
  { email: "seller6@plazo.com", firstName: "Naya", lastName: "Creative", role: UserRole.SELLER },
  { email: "seller7@plazo.com", firstName: "Bima", lastName: "Tech", role: UserRole.SELLER },
  { email: "seller8@plazo.com", firstName: "Raka", lastName: "Media", role: UserRole.SELLER },
  { email: "seller9@plazo.com", firstName: "Sinta", lastName: "Fashion", role: UserRole.SELLER },
  { email: "seller10@plazo.com", firstName: "Arif", lastName: "Electronics", role: UserRole.SELLER },
  { email: "seller11@plazo.com", firstName: "Lina", lastName: "Handmade", role: UserRole.SELLER },
  { email: "seller12@plazo.com", firstName: "Yoga", lastName: "Furniture", role: UserRole.SELLER },
  { email: "seller13@plazo.com", firstName: "Dina", lastName: "Books", role: UserRole.SELLER },
  { email: "seller14@plazo.com", firstName: "Hendra", lastName: "Gadgets", role: UserRole.SELLER },
  { email: "seller15@plazo.com", firstName: "Wati", lastName: "Kitchen", role: UserRole.SELLER },
  { email: "seller16@plazo.com", firstName: "Andi", lastName: "Sports", role: UserRole.SELLER },
  { email: "seller17@plazo.com", firstName: "Lia", lastName: "Beauty", role: UserRole.SELLER },
  { email: "seller18@plazo.com", firstName: "Rudi", lastName: "Automotive", role: UserRole.SELLER },
  { email: "seller19@plazo.com", firstName: "Nina", lastName: "Kids", role: UserRole.SELLER },
  { email: "seller20@plazo.com", firstName: "Bayu", lastName: "Gaming", role: UserRole.SELLER },
  { email: "seller21@plazo.com", firstName: "Citra", lastName: "Jewelry", role: UserRole.SELLER },
  { email: "seller22@plazo.com", firstName: "Doni", lastName: "Music", role: UserRole.SELLER },
  { email: "seller23@plazo.com", firstName: "Eka", lastName: "Art", role: UserRole.SELLER },
  { email: "seller24@plazo.com", firstName: "Fani", lastName: "Craft", role: UserRole.SELLER },
  { email: "seller25@plazo.com", firstName: "Gita", lastName: "Organic", role: UserRole.SELLER },
  { email: "seller26@plazo.com", firstName: "Hadi", lastName: "Tools", role: UserRole.SELLER },
  { email: "seller27@plazo.com", firstName: "Ika", lastName: "Toys", role: UserRole.SELLER },
  { email: "seller28@plazo.com", firstName: "Jaya", lastName: "Pet", role: UserRole.SELLER },
  { email: "seller29@plazo.com", firstName: "Kiki", lastName: "Garden", role: UserRole.SELLER },
  { email: "seller30@plazo.com", firstName: "Luki", lastName: "Office", role: UserRole.SELLER },
];

// ============================================
// MAIN SEED FUNCTION
// ============================================

async function main() {
  console.log("🌱 Starting comprehensive seed...");

  // Hash password once
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  // ============================================
  // 1. CREATE CATEGORIES
  // ============================================
  console.log("📁 Creating categories...");
  
  const categories = await Promise.all(
    CATEGORIES_DATA.map(async (cat) => {
      return prisma.category.upsert({
        where: { slug: cat.slug },
        update: {},
        create: {
          name: cat.name,
          slug: cat.slug,
          type: cat.type as any,
        },
      });
    })
  );
  
  console.log(`✅ Created ${categories.length} categories`);

  // ============================================
  // 2. CREATE USERS
  // ============================================
  console.log("👥 Creating users...");
  
  const users = await Promise.all(
    USERS_DATA.map(async (userData) => {
      return prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          password: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          isEmailVerified: true,
          isActive: true,
          phone: `08${randomInt(1000000000, 9999999999)}`,
          bio: `Hi, I'm ${userData.firstName}! ${
            userData.role === UserRole.SELLER 
              ? "I provide quality products and services." 
              : "I love shopping on Plazo!"
          }`,
        },
      });
    })
  );
  
  console.log(`✅ Created ${users.length} users`);

  // Get sellers for tenant creation
  const sellers = users.filter(u => u.role === UserRole.SELLER);
  const buyers = users.filter(u => u.role === UserRole.BUYER);

  // ============================================
  // 3. CREATE TENANTS (STORES)
  // ============================================
  console.log("🏪 Creating tenants/stores...");
  
  const tenants = await Promise.all(
    sellers.map(async (seller, index) => {
      const subdomain = `${seller.firstName.toLowerCase()}-${seller.lastName.toLowerCase()}`;
      const plans = [
        SubscriptionPlan.FREE,
        SubscriptionPlan.BASIC,
        SubscriptionPlan.PREMIUM,
        SubscriptionPlan.PROFESSIONAL,
      ];
      const plan = randomElement(plans);
      
      return prisma.tenant.upsert({
        where: { subdomain },
        update: {},
        create: {
          subdomain,
          name: `${seller.firstName} ${seller.lastName} Store`,
          description: `Welcome to ${seller.firstName}'s store! We offer the best products and services.`,
          ownerId: seller.id,
          subscriptionPlan: plan,
          sellerTier: plan === SubscriptionPlan.FREE ? SellerTier.FREE : SellerTier.MEMBER,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
          logo: image(`photo-${1500 + index}-${randomInt(1000, 9999)}`),
          banner: image(`photo-${1600 + index}-${randomInt(1000, 9999)}`),
          city: randomElement(CITIES),
        },
      });
    })
  );
  
  console.log(`✅ Created ${tenants.length} tenants`);

  // ============================================
  // 4. CREATE PRODUCTS (100 products)
  // ============================================
  console.log("📦 Creating products...");
  
  const productCategories = categories.filter(c => c.type === "PRODUCT");
  const products = [];
  
  for (let i = 0; i < 100; i++) {
    const tenant = randomElement(tenants);
    const category = randomElement(productCategories);
    const isDigital = Math.random() > 0.7; // 30% digital products
    
    const productNames = [
      "Premium", "Professional", "Ultimate", "Deluxe", "Standard",
      "Basic", "Advanced", "Pro", "Elite", "Master"
    ];
    const productTypes = [
      "Package", "Bundle", "Set", "Kit", "Collection",
      "Edition", "Version", "Series", "Model", "Design"
    ];
    
    const name = `${randomElement(productNames)} ${category.name} ${randomElement(productTypes)} ${i + 1}`;
    const price = randomInt(50000, 5000000);
    const comparePrice = Math.random() > 0.5 ? price + randomInt(10000, 500000) : undefined;
    
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomInt(1000, 9999)}`,
        description: `High quality ${name}. Perfect for your needs. Includes warranty and support.`,
        price,
        comparePrice,
        stock: randomInt(10, 100),
        categoryId: category.id,
        images: [
          image(`photo-${2000 + i}-${randomInt(1000, 9999)}`),
          image(`photo-${2100 + i}-${randomInt(1000, 9999)}`),
          image(`photo-${2200 + i}-${randomInt(1000, 9999)}`),
        ],
        thumbnail: image(`photo-${2000 + i}-${randomInt(1000, 9999)}`),
        tags: [category.name, "Quality", "Bestseller", "Recommended"],
        productType: isDigital ? ProductType.DIGITAL : ProductType.PHYSICAL,
        isDigital,
        isPublished: true,
        publishToMarketplace: Math.random() > 0.3, // 70% published to marketplace
        city: tenant.city,
        viewCount: randomInt(10, 1000),
        orderCount: randomInt(0, 50),
      },
    });
    
    products.push(product);
  }
  
  console.log(`✅ Created ${products.length} products`);

  // ============================================
  // 5. CREATE SERVICES (50 services)
  // ============================================
  console.log("🛠️ Creating services...");
  
  const serviceCategories = categories.filter(c => c.type === "SERVICE");
  const services = [];
  
  for (let i = 0; i < 50; i++) {
    const tenant = randomElement(tenants);
    const category = randomElement(serviceCategories);
    
    const serviceLevels = ["Basic", "Standard", "Premium", "Enterprise"];
    const name = `${randomElement(serviceLevels)} ${category.name} Service`;
    const basePrice = randomInt(100000, 10000000);
    
    const service = await prisma.service.create({
      data: {
        tenantId: tenant.id,
        name,
        slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomInt(1000, 9999)}`,
        description: `Professional ${name}. Fast delivery, high quality results.`,
        basePrice,
        comparePrice: Math.random() > 0.5 ? basePrice + randomInt(50000, 500000) : undefined,
        categoryId: category.id,
        thumbnail: image(`photo-${3000 + i}-${randomInt(1000, 9999)}`),
        tags: [category.name, "Professional", "Fast Delivery"],
        isPublished: true,
        publishToMarketplace: Math.random() > 0.2, // 80% published
        viewCount: randomInt(5, 500),
        orderCount: randomInt(0, 30),
      },
    });
    
    services.push(service);
  }
  
  console.log(`✅ Created ${services.length} services`);

  console.log("✨ Comprehensive seed completed successfully!");
  console.log(`
📊 Summary:
- Categories: ${categories.length}
- Users: ${users.length} (${sellers.length} sellers, ${buyers.length} buyers)
- Tenants: ${tenants.length}
- Products: ${products.length}
- Services: ${services.length}

🔑 Login credentials:
Email: Any user from the list above
Password: ${DEFAULT_PASSWORD}

Example:
- Super Admin: superadmin@plazo.com / ${DEFAULT_PASSWORD}
- Seller: seller1@plazo.com / ${DEFAULT_PASSWORD}
- Buyer: buyer1@plazo.com / ${DEFAULT_PASSWORD}
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
