import { PrismaClient } from "@prisma/client";
import { MeiliSearch } from "meilisearch";

// Script manual sync data ke Meilisearch (tanpa auth API).
// Jalankan: npx ts-node scripts/sync-meilisearch.ts
const prisma = new PrismaClient();

const host = process.env.MEILISEARCH_HOST || "http://localhost:7700";
const apiKey = process.env.MEILISEARCH_API_KEY || "";
const client = new MeiliSearch({ host, apiKey });

async function syncProducts() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      tags: true,
      city: true,
      categoryId: true,
      isPublished: true,
      publishToMarketplace: true,
      isBoosted: true,
      viewCount: true,
      createdAt: true,
      tenantId: true,
      category: { select: { name: true } },
      tenant: { select: { name: true, isActive: true } },
    },
  });

  const docs = products.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    name: p.name,
    description: p.description,
    price: p.price,
    tags: p.tags,
    city: p.city || "",
    categoryId: p.categoryId,
    categoryName: p.category?.name || "",
    tenantName: p.tenant?.name || "",
    isPublished: p.isPublished,
    publishToMarketplace: p.publishToMarketplace,
    tenantActive: p.tenant?.isActive ?? false,
    isBoosted: p.isBoosted,
    viewCount: p.viewCount,
    createdAt: p.createdAt.getTime(),
  }));

  const index = client.index("products");
  await index.updateSettings({
    searchableAttributes: ["name", "description", "tags", "categoryName", "tenantName"],
    filterableAttributes: [
      "tenantId",
      "categoryId",
      "city",
      "price",
      "isPublished",
      "publishToMarketplace",
      "tenantActive",
    ],
    sortableAttributes: ["price", "createdAt", "viewCount", "isBoosted"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Products: ${docs.length}`);
}

async function syncServices() {
  const services = await prisma.service.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      basePrice: true,
      tags: true,
      city: true,
      categoryId: true,
      isPublished: true,
      publishToMarketplace: true,
      isBoosted: true,
      viewCount: true,
      createdAt: true,
      tenantId: true,
      category: { select: { name: true } },
      tenant: { select: { name: true, isActive: true } },
    },
  });

  const docs = services.map((s) => ({
    id: s.id,
    tenantId: s.tenantId,
    name: s.name,
    description: s.description,
    price: s.basePrice,
    tags: s.tags,
    city: s.city || "",
    categoryId: s.categoryId,
    categoryName: s.category?.name || "",
    tenantName: s.tenant?.name || "",
    isPublished: s.isPublished,
    publishToMarketplace: s.publishToMarketplace,
    tenantActive: s.tenant?.isActive ?? false,
    isBoosted: s.isBoosted,
    viewCount: s.viewCount,
    createdAt: s.createdAt.getTime(),
  }));

  const index = client.index("services");
  await index.updateSettings({
    searchableAttributes: ["name", "description", "tags", "categoryName", "tenantName"],
    filterableAttributes: [
      "tenantId",
      "categoryId",
      "city",
      "price",
      "isPublished",
      "publishToMarketplace",
      "tenantActive",
    ],
    sortableAttributes: ["price", "createdAt", "viewCount", "isBoosted"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Services: ${docs.length}`);
}

async function syncArticles() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      title: true,
      excerpt: true,
      content: true,
      tags: true,
      categoryId: true,
      viewCount: true,
      createdAt: true,
      category: { select: { name: true } },
    },
  });

  const docs = articles.map((a) => ({
    id: a.id,
    title: a.title,
    excerpt: a.excerpt || "",
    content: a.content,
    tags: a.tags,
    categoryId: a.categoryId || "",
    categoryName: a.category?.name || "",
    status: "PUBLISHED",
    viewCount: a.viewCount,
    createdAt: a.createdAt.getTime(),
  }));

  const index = client.index("articles");
  await index.updateSettings({
    searchableAttributes: ["title", "excerpt", "content", "tags"],
    filterableAttributes: ["status", "categoryId"],
    sortableAttributes: ["createdAt", "viewCount"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Articles: ${docs.length}`);
}

async function syncForumPosts() {
  const posts = await prisma.forumPost.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, title: true, content: true, createdAt: true },
  });

  const docs = posts.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    status: "PUBLISHED",
    createdAt: p.createdAt.getTime(),
  }));

  const index = client.index("forum-posts");
  await index.updateSettings({
    searchableAttributes: ["title", "content"],
    filterableAttributes: ["status"],
    sortableAttributes: ["createdAt"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Forum posts: ${docs.length}`);
}

async function syncJobs() {
  const jobs = await prisma.job.findMany({
    where: { status: "OPEN", deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      tags: true,
      city: true,
      budget: true,
      tenantId: true,
      createdAt: true,
      tenant: { select: { isActive: true } },
    },
  });

  const docs = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    description: j.description,
    tags: j.tags,
    city: j.city || "",
    budget: j.budget,
    status: "OPEN",
    tenantId: j.tenantId,
    tenantActive: j.tenant?.isActive ?? false,
    createdAt: j.createdAt.getTime(),
  }));

  const index = client.index("jobs");
  await index.updateSettings({
    searchableAttributes: ["title", "description", "tags", "city"],
    filterableAttributes: ["status", "city", "tenantId"],
    sortableAttributes: ["createdAt", "budget"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Jobs: ${docs.length}`);
}

async function syncSellers() {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      tagline: true,
      description: true,
      city: true,
      subdomain: true,
      isVerified: true,
      logo: true,
      createdAt: true,
    },
  });

  const docs = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    tagline: t.tagline || "",
    description: t.description || "",
    city: t.city || "",
    subdomain: t.subdomain,
    isActive: true,
    isVerified: t.isVerified,
    logo: t.logo,
    createdAt: t.createdAt.getTime(),
  }));

  const index = client.index("sellers");
  await index.updateSettings({
    searchableAttributes: ["name", "tagline", "description", "city"],
    filterableAttributes: ["isActive", "city", "isVerified"],
    sortableAttributes: ["createdAt"],
  });
  await index.deleteAllDocuments();
  if (docs.length > 0) await index.addDocuments(docs, { primaryKey: "id" });
  console.log(`✅ Sellers: ${docs.length}`);
}

async function main() {
  console.log(`Sync ke Meilisearch: ${host}`);
  await syncProducts();
  await syncServices();
  await syncArticles();
  await syncForumPosts();
  await syncJobs();
  await syncSellers();
  console.log("Selesai.");
}

main()
  .catch((e) => {
    console.error("Gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });