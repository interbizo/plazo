import { Injectable, Logger } from "@nestjs/common";
import { MeiliSearch } from "meilisearch";
import { PrismaService } from "@modules/database/prisma.service";

// Search via Meilisearch (produk & jasa). Jika MEILISEARCH_HOST/API_KEY tidak diisi,
// semua method no-op dan search fallback ke Prisma (LIKE) seperti sebelumnya.
@Injectable()
export class MeilisearchService {
  private readonly logger = new Logger(MeilisearchService.name);
  private readonly client: MeiliSearch | null = null;
  private readonly enabled: boolean;

  constructor(private prisma: PrismaService) {
    const host = process.env.MEILISEARCH_HOST;
    const apiKey = process.env.MEILISEARCH_API_KEY;

    this.enabled = Boolean(host && apiKey);
    if (!this.enabled) {
      this.logger.warn(
        "Meilisearch tidak dikonfigurasi (MEILISEARCH_HOST/MEILISEARCH_API_KEY) — search fallback ke Prisma",
      );
      return;
    }

    this.client = new MeiliSearch({
      host: host!,
      apiKey: apiKey ?? "",
    });
    this.logger.log(`Meilisearch terhubung ke ${host}`);
    void this.ensureIndexes();
  }

  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  private get productsIndex() {
    return this.client!.index("products");
  }

  private get servicesIndex() {
    return this.client!.index("services");
  }

  private get articlesIndex() {
    return this.client!.index("articles");
  }

  private get forumIndex() {
    return this.client!.index("forum-posts");
  }

  private get jobsIndex() {
    return this.client!.index("jobs");
  }

  private get sellersIndex() {
    return this.client!.index("sellers");
  }

  // Set atribut yang bisa di-search, difilter, dan disortir (idempotent).
  private async ensureIndexes() {
    try {
      await Promise.all([
        this.productsIndex.updateSettings({
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
        }),
        this.servicesIndex.updateSettings({
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
        }),
        this.articlesIndex.updateSettings({
          searchableAttributes: ["title", "excerpt", "content", "tags"],
          filterableAttributes: ["status", "categoryId"],
          sortableAttributes: ["createdAt", "viewCount"],
        }),
        this.forumIndex.updateSettings({
          searchableAttributes: ["title", "content"],
          filterableAttributes: ["status"],
          sortableAttributes: ["createdAt"],
        }),
        this.jobsIndex.updateSettings({
          searchableAttributes: ["title", "description", "tags", "city"],
          filterableAttributes: ["status", "city", "tenantId"],
          sortableAttributes: ["createdAt", "budget"],
        }),
        this.sellersIndex.updateSettings({
          searchableAttributes: ["name", "tagline", "description", "city"],
          filterableAttributes: ["isActive", "city", "isVerified"],
          sortableAttributes: ["createdAt"],
        }),
      ]);
      this.logger.log("Index settings Meilisearch siap");
    } catch (error) {
      this.logger.error("Gagal setup index Meilisearch:", error);
    }
  }

  // ============ SYNC ============

  // Sync ulang SEMUA produk ke index.
  async syncAllProducts(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const products = await this.prisma.product.findMany({
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
        deletedAt: true,
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

    await this.productsIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.productsIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync products: ${docs.length}`);
    return docs.length;
  }

  // Sync ulang SEMUA jasa ke index.
  async syncAllServices(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const services = await this.prisma.service.findMany({
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
        deletedAt: true,
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

    await this.servicesIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.servicesIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync services: ${docs.length}`);
    return docs.length;
  }

  // Sync artikel (status PUBLISHED).
  async syncAllArticles(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const articles = await this.prisma.article.findMany({
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

    await this.articlesIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.articlesIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync articles: ${docs.length}`);
    return docs.length;
  }

  // Sync post forum (status PUBLISHED).
  async syncAllForumPosts(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const posts = await this.prisma.forumPost.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    const docs = posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      status: "PUBLISHED",
      createdAt: p.createdAt.getTime(),
    }));

    await this.forumIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.forumIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync forum posts: ${docs.length}`);
    return docs.length;
  }

  // Sync job (status OPEN).
  async syncAllJobs(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const jobs = await this.prisma.job.findMany({
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

    await this.jobsIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.jobsIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync jobs: ${docs.length}`);
    return docs.length;
  }

  // Sync toko/seller (tenant aktif).
  async syncAllSellers(): Promise<number> {
    if (!this.isEnabled()) return 0;

    const tenants = await this.prisma.tenant.findMany({
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

    await this.sellersIndex.deleteAllDocuments();
    if (docs.length > 0) {
      await this.sellersIndex.addDocuments(docs, { primaryKey: "id" });
    }
    this.logger.log(`Meilisearch sync sellers: ${docs.length}`);
    return docs.length;
  }

  // Sync satu produk (dipanggil setelah create/update).
  async syncProduct(id: string): Promise<void> {
    if (!this.isEnabled()) return;

    const p = await this.prisma.product.findUnique({
      where: { id },
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
        deletedAt: true,
        tenantId: true,
        category: { select: { name: true } },
        tenant: { select: { name: true, isActive: true } },
      },
    });

    if (!p || p.deletedAt) {
      await this.productsIndex.deleteDocument(id);
      return;
    }

    await this.productsIndex.addDocuments(
      [
        {
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
        },
      ],
      { primaryKey: "id" },
    );
  }

  // Sync satu jasa (dipanggil setelah create/update).
  async syncService(id: string): Promise<void> {
    if (!this.isEnabled()) return;

    const s = await this.prisma.service.findUnique({
      where: { id },
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
        deletedAt: true,
        tenantId: true,
        category: { select: { name: true } },
        tenant: { select: { name: true, isActive: true } },
      },
    });

    if (!s || s.deletedAt) {
      await this.servicesIndex.deleteDocument(id);
      return;
    }

    await this.servicesIndex.addDocuments(
      [
        {
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
        },
      ],
      { primaryKey: "id" },
    );
  }

  // Hapus dokumen dari index (dipanggil setelah delete).
  async removeProduct(id: string): Promise<void> {
    if (!this.isEnabled()) return;
    await this.productsIndex.deleteDocument(id);
  }

  async removeService(id: string): Promise<void> {
    if (!this.isEnabled()) return;
    await this.servicesIndex.deleteDocument(id);
  }

  // ============ SEARCH ============

  // Cari produk. Return { ids, total } — detail diambil dari DB oleh pemanggil.
  async searchProducts(
    q: string,
    opts: {
      categoryIds?: string[];
      city?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
      offset?: number;
      sort?: string;
    } = {},
  ): Promise<{ ids: string[]; total: number }> {
    if (!this.isEnabled()) return { ids: [], total: 0 };

    const filters: string[] = [
      "isPublished = true",
      "publishToMarketplace = true",
      "tenantActive = true",
    ];
    if (opts.categoryIds?.length) {
      filters.push(`categoryId IN [${opts.categoryIds.map((c) => `"${c}"`).join(", ")}]`);
    }
    if (opts.city) filters.push(`city = "${opts.city}"`);
    if (opts.minPrice !== undefined) filters.push(`price >= ${opts.minPrice}`);
    if (opts.maxPrice !== undefined) filters.push(`price <= ${opts.maxPrice}`);

    const sort = this.toMeiliSort(opts.sort);

    const result = await this.productsIndex.search(q, {
      filter: filters.join(" AND "),
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      sort,
      attributesToRetrieve: ["id"],
    });

    return {
      ids: result.hits.map((h: any) => h.id as string),
      total: result.estimatedTotalHits ?? 0,
    };
  }

  // Cari jasa. Return { ids, total }.
  async searchServices(
    q: string,
    opts: {
      categoryIds?: string[];
      city?: string;
      minPrice?: number;
      maxPrice?: number;
      limit?: number;
      offset?: number;
      sort?: string;
    } = {},
  ): Promise<{ ids: string[]; total: number }> {
    if (!this.isEnabled()) return { ids: [], total: 0 };

    const filters: string[] = [
      "isPublished = true",
      "publishToMarketplace = true",
      "tenantActive = true",
    ];
    if (opts.categoryIds?.length) {
      filters.push(`categoryId IN [${opts.categoryIds.map((c) => `"${c}"`).join(", ")}]`);
    }
    if (opts.city) filters.push(`city = "${opts.city}"`);
    if (opts.minPrice !== undefined) filters.push(`price >= ${opts.minPrice}`);
    if (opts.maxPrice !== undefined) filters.push(`price <= ${opts.maxPrice}`);

    const sort = this.toMeiliSort(opts.sort);

    const result = await this.servicesIndex.search(q, {
      filter: filters.join(" AND "),
      limit: opts.limit ?? 20,
      offset: opts.offset ?? 0,
      sort,
      attributesToRetrieve: ["id"],
    });

    return {
      ids: result.hits.map((h: any) => h.id as string),
      total: result.estimatedTotalHits ?? 0,
    };
  }

private toMeiliSort(sortBy?: string): string[] {
    switch (sortBy) {
      case "price_asc":
        return ["price:asc"];
      case "price_desc":
        return ["price:desc"];
      case "newest":
        return ["createdAt:desc"];
      case "popular":
        return ["viewCount:desc"];
      default:
        return ["isBoosted:desc", "createdAt:desc"];
    }
  }

  // Cari judul/nama di index lain (artikel, forum, jobs, sellers) untuk saran.
  async searchTitles(
    indexName: "articles" | "forum-posts" | "jobs" | "sellers",
    q: string,
    limit = 5,
  ): Promise<Array<{ id: string; name: string }>> {
    if (!this.isEnabled()) return [];

    try {
      const result = await this.client!.index(indexName).search(q, {
        limit,
        attributesToRetrieve: indexName === "articles" || indexName === "forum-posts" || indexName === "jobs" ? ["title"] : ["name"],
      });

      return (result.hits as any[]).map((h) => ({
        id: h.id as string,
        name: indexName === "articles" || indexName === "forum-posts" || indexName === "jobs"
          ? (h.title as string)
          : (h.name as string),
      }));
    } catch (error) {
      this.logger.error(`searchTitles (${indexName}) gagal:`, error);
      return [];
    }
  }

  // Koreksi typo ala Google ("Apakah maksud Anda?").
// Meilisearch menandai bagian yang cocok walau typo dengan <em> pada _formatted.
// Kita ekstrak kata-kata dalam <em> → itulah ejaan yang benar dari query.
// Return null bila tidak ada koreksi.
async getCorrection(q: string): Promise<string | null> {
    if (!this.isEnabled() || !q.trim()) return null;

    const searchOpts = {
      limit: 1,
      attributesToRetrieve: ["name"],
      attributesToHighlight: ["name"],
    };

    try {
      const [productRes, serviceRes] = await Promise.all([
        this.productsIndex.search(q, searchOpts),
        this.servicesIndex.search(q, searchOpts),
      ]);

      const hit: any = productRes.hits[0] || serviceRes.hits[0];
      if (!hit) return null;

      // Ambil kata yang di-highlight (bagian yang cocok dengan query, terkoreksi typo)
      const formatted: string = hit._formatted?.name || hit.name || "";
      const matches = formatted.match(/<em>([^<]+)<\/em>/g) || [];
      const correctedWords = matches
        .map((m: string) => m.replace(/<\/?em>/g, "").trim())
        .filter(Boolean);

      if (correctedWords.length === 0) return null;

      const correction = correctedWords.join(" ");
      // Kalau sama dengan query → tidak ada typo
      if (correction.toLowerCase() === q.trim().toLowerCase()) return null;

      return correction;
    } catch (error) {
      this.logger.error("getCorrection gagal:", error);
      return null;
    }
  }
}