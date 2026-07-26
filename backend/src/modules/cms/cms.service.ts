import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  CreateCmsPageDto,
  UpdateCmsPageDto,
  CreateBannerDto,
  UpdateBannerDto,
  UpsertSiteSettingDto,
  CreateFaqDto,
  UpdateFaqDto,
} from "./cms.dto";
import { PaginationHelper } from "../../common/utils/pagination.helper";

@Injectable()
export class CmsService {
  constructor(private prisma: PrismaService) {}

  // ============ CMS PAGES ============

  async createPage(dto: CreateCmsPageDto, adminId: string) {
    const existing = await this.prisma.cmsPage.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException("Slug already exists");

    return this.prisma.cmsPage.create({
      data: {
        ...dto,
        status: (dto.status as any) || "DRAFT",
        createdBy: adminId,
        publishedAt: dto.status === "PUBLISHED" ? new Date() : null,
      },
    });
  }

  async updatePage(id: string, dto: UpdateCmsPageDto) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");

    const data: any = { ...dto };
    if (dto.status === "PUBLISHED" && page.status !== "PUBLISHED") {
      data.publishedAt = new Date();
    }

    return this.prisma.cmsPage.update({ where: { id }, data });
  }

  async deletePage(id: string) {
    await this.prisma.cmsPage.delete({ where: { id } });
    return { message: "Page deleted" };
  }

  async getPage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async getPageBySlug(slug: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { slug } });
    if (!page || page.status !== "PUBLISHED")
      throw new NotFoundException("Page not found");
    return page;
  }

  async listPages(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { ...(status && { status }) };

    const [pages, total] = await Promise.all([
      this.prisma.cmsPage.findMany({
        where,
        skip,
        take,
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.cmsPage.count({ where }),
    ]);

    return PaginationHelper.formatResponse(pages, total, page, limit);
  }

  async getNavigationPages() {
    return this.prisma.cmsPage.findMany({
      where: { status: "PUBLISHED", isInNavigation: true },
      select: { id: true, slug: true, title: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ============ BANNERS ============

  async createBanner(dto: CreateBannerDto, adminId: string) {
    return this.prisma.cmsBanner.create({
      data: {
        ...dto,
        status: (dto.status as any) || "ACTIVE",
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdBy: adminId,
      },
    });
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.cmsBanner.findUnique({ where: { id } });
    if (!banner) throw new NotFoundException("Banner not found");

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.cmsBanner.update({ where: { id }, data });
  }

  async deleteBanner(id: string) {
    await this.prisma.cmsBanner.delete({ where: { id } });
    return { message: "Banner deleted" };
  }

  async listBanners(status?: string, position?: string) {
    const where: any = {
      ...(status && { status }),
      ...(position && { position }),
    };

    return this.prisma.cmsBanner.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async getActiveBanners(position = "homepage_hero") {
    const now = new Date();
    
    // Get regular active banners (not fallback)
    const banners = await this.prisma.cmsBanner.findMany({
      where: {
        status: "ACTIVE",
        position,
        isFallback: false,
        OR: [
          { startDate: null, endDate: null },
          { startDate: { lte: now }, endDate: null },
          { startDate: null, endDate: { gte: now } },
          { startDate: { lte: now }, endDate: { gte: now } },
        ],
      },
      orderBy: { sortOrder: "asc" },
    });

    // If no active banners, get fallback banners
    if (banners.length === 0) {
      return this.prisma.cmsBanner.findMany({
        where: {
          status: "ACTIVE",
          position,
          isFallback: true,
        },
        orderBy: { sortOrder: "asc" },
      });
    }

    return banners;
  }

  async getFallbackBanners(position = "homepage_hero") {
    return this.prisma.cmsBanner.findMany({
      where: {
        status: "ACTIVE",
        position,
        isFallback: true,
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ============ SITE SETTINGS ============

  async upsertSetting(dto: UpsertSiteSettingDto, adminId: string) {
    return this.prisma.siteSetting.upsert({
      where: { key: dto.key },
      update: {
        value: dto.value,
        group: dto.group,
        description: dto.description,
        updatedBy: adminId,
      },
      create: {
        key: dto.key,
        value: dto.value,
        group: dto.group || "general",
        description: dto.description,
        updatedBy: adminId,
      },
    });
  }

  async bulkUpdateSettings(settings: UpsertSiteSettingDto[], adminId: string) {
    const results = [];
    for (const s of settings) {
      results.push(await this.upsertSetting(s, adminId));
    }
    return results;
  }

  async getSettings(group?: string) {
    const where: any = group ? { group } : {};
    return this.prisma.siteSetting.findMany({ where, orderBy: { key: "asc" } });
  }

  async getSetting(key: string) {
    const setting = await this.prisma.siteSetting.findUnique({
      where: { key },
    });
    if (!setting) throw new NotFoundException(`Setting "${key}" not found`);
    return setting;
  }

  async deleteSetting(key: string) {
    await this.prisma.siteSetting.delete({ where: { key } });
    return { message: "Setting deleted" };
  }

  // ============ SEO HELPERS ============

  async getSeoDefaults() {
    const seoSettings = await this.prisma.siteSetting.findMany({
      where: { group: "seo" },
    });
    const map: Record<string, string> = {};
    seoSettings.forEach((s) => (map[s.key] = s.value));
    return {
      siteTitle: map["seo_site_title"] || "",
      siteDescription: map["seo_site_description"] || "",
      siteKeywords: map["seo_site_keywords"] || "",
      ogImage: map["seo_og_image"] || "",
      robotsTxt: map["seo_robots_txt"] || "User-agent: *\nAllow: /",
      googleAnalyticsId: map["seo_ga_id"] || "",
      facebookPixelId: map["seo_fb_pixel"] || "",
    };
  }

  async generateSitemap(baseUrl?: string) {
    const base = baseUrl || process.env.APP_URL || "http://localhost:3001";

    const [pages, products, services, jobs] = await Promise.all([
      this.prisma.cmsPage.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true },
      }),
      this.prisma.product.findMany({
        where: { isPublished: true, deletedAt: null },
        select: {
          slug: true,
          updatedAt: true,
          tenant: { select: { subdomain: true } },
        },
      }),
      this.prisma.service.findMany({
        where: { isPublished: true, deletedAt: null },
        select: {
          slug: true,
          updatedAt: true,
          tenant: { select: { subdomain: true } },
        },
      }),
      this.prisma.job.findMany({
        where: { deletedAt: null, status: "OPEN" },
        select: {
          slug: true,
          updatedAt: true,
          tenant: { select: { subdomain: true } },
        },
      }),
    ]);

    const urls = [
      ...pages.map((p) => ({
        loc: `${base}/page/${p.slug}`,
        lastmod: p.updatedAt.toISOString(),
        changefreq: "monthly",
        priority: "0.6",
      })),
      ...products.map((p) => ({
        loc: `${base}/${p.tenant.subdomain}/products/${p.slug}`,
        lastmod: p.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: "0.8",
      })),
      ...services.map((s) => ({
        loc: `${base}/${s.tenant.subdomain}/services/${s.slug}`,
        lastmod: s.updatedAt.toISOString(),
        changefreq: "weekly",
        priority: "0.8",
      })),
      ...jobs.map((j) => ({
        loc: `${base}/${j.tenant.subdomain}/jobs/${j.slug}`,
        lastmod: j.updatedAt.toISOString(),
        changefreq: "daily",
        priority: "0.7",
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

    return { xml, urls, totalUrls: urls.length };
  }

  // ============ FAQ ============

  async createFaq(dto: CreateFaqDto) {
    return this.prisma.faqItem.create({ data: dto as any });
  }

  async updateFaq(id: string, dto: UpdateFaqDto) {
    const faq = await this.prisma.faqItem.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException("FAQ not found");
    return this.prisma.faqItem.update({ where: { id }, data: dto as any });
  }

  async deleteFaq(id: string) {
    await this.prisma.faqItem.delete({ where: { id } });
    return { message: "FAQ deleted" };
  }

  async listFaqs(category?: string, publishedOnly = false) {
    const where: any = {
      ...(category && { category }),
      ...(publishedOnly && { isPublished: true }),
    };
    return this.prisma.faqItem.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  // ============ FLASH SALE ============

  // ============ FLASH SALE EVENTS ============

  async createFlashSaleEvent(dto: any) {
    return this.prisma.flashSaleEvent.create({
      data: {
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listFlashSaleEvents() {
    return this.prisma.flashSaleEvent.findMany({
      include: {
        _count: { select: { items: true } },
      },
      orderBy: { startDate: "desc" },
    });
  }

  async updateFlashSaleEvent(id: string, dto: any) {
    const event = await this.prisma.flashSaleEvent.findUnique({ where: { id } });
    if (!event) throw new NotFoundException("Flash sale event not found");

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (typeof dto.isActive === "boolean") data.isActive = dto.isActive;

    return this.prisma.flashSaleEvent.update({ where: { id }, data });
  }

  async deleteFlashSaleEvent(id: string) {
    // Unlink items first
    await this.prisma.flashSaleItem.updateMany({
      where: { eventId: id },
      data: { eventId: null },
    });
    await this.prisma.flashSaleEvent.delete({ where: { id } });
    return { message: "Flash sale event deleted" };
  }

  async getActiveFlashSaleEvent() {
    const now = new Date();
    return this.prisma.flashSaleEvent.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "desc" },
    });
  }

  // ============ FLASH SALE ITEMS ============

  async createFlashSaleItem(dto: any, approvedBy?: string) {
    // If no eventId provided, try to assign to active event
    let eventId = dto.eventId || null;
    if (!eventId) {
      const activeEvent = await this.getActiveFlashSaleEvent();
      if (activeEvent) eventId = activeEvent.id;
    }

    const data: any = {
      tenantId: dto.tenantId,
      salePrice: dto.salePrice,
      originalPrice: dto.originalPrice,
      discountPercent:
        dto.discountPercent ||
        Math.round((1 - dto.salePrice / dto.originalPrice) * 100),
      eventId,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      position: dto.position || "flash_sale",
      sortOrder: dto.sortOrder || 0,
      status: approvedBy ? "APPROVED" : "PENDING",
      approvedBy: approvedBy || null,
    };
    if (dto.productId) data.productId = dto.productId;
    if (dto.serviceId) data.serviceId = dto.serviceId;

    return this.prisma.flashSaleItem.create({ data });
  }

  async listFlashSaleItems(status?: string, position?: string) {
    const where: any = {
      ...(status && { status }),
      ...(position && { position }),
    };
    return this.prisma.flashSaleItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
            images: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            basePrice: true,
          },
        },
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async updateFlashSaleItem(id: string, dto: any) {
    const item = await this.prisma.flashSaleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Flash sale item not found");

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.salePrice && dto.originalPrice) {
      data.discountPercent = Math.round(
        (1 - dto.salePrice / dto.originalPrice) * 100,
      );
    }

    return this.prisma.flashSaleItem.update({ where: { id }, data });
  }

  async approveFlashSaleItem(id: string, adminId: string) {
    const item = await this.prisma.flashSaleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Flash sale item not found");
    return this.prisma.flashSaleItem.update({
      where: { id },
      data: { status: "APPROVED", approvedBy: adminId },
    });
  }

  async rejectFlashSaleItem(id: string, reason: string) {
    const item = await this.prisma.flashSaleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException("Flash sale item not found");
    return this.prisma.flashSaleItem.update({
      where: { id },
      data: { status: "REJECTED", rejectedReason: reason },
    });
  }

  async deleteFlashSaleItem(id: string) {
    await this.prisma.flashSaleItem.delete({ where: { id } });
    return { message: "Flash sale item deleted" };
  }

  async getActiveFlashSaleItems(position = "flash_sale") {
    const now = new Date();

    // Find active event
    const activeEvent = await this.prisma.flashSaleEvent.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "desc" },
    });

    // Build where clause: items in active event OR legacy items with own dates
    const where: any = {
      status: "APPROVED",
      position,
      OR: [
        // New flow: items linked to active event
        ...(activeEvent ? [{ eventId: activeEvent.id }] : []),
        // Legacy flow: items with own startDate/endDate
        {
          eventId: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      ],
    };

    const items = await this.prisma.flashSaleItem.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
            comparePrice: true,
            images: true,
            stock: true,
            category: { select: { id: true, name: true, slug: true } },
            tenant: {
              select: {
                id: true,
                name: true,
                subdomain: true,
                logo: true,
                owner: {
                  select: {
                    sellerProfile: {
                      select: { averageRating: true, totalReviews: true },
                    },
                  },
                },
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            basePrice: true,
            comparePrice: true,
            category: { select: { id: true, name: true, slug: true } },
            tenant: {
              select: {
                id: true,
                name: true,
                subdomain: true,
                logo: true,
                owner: {
                  select: {
                    sellerProfile: {
                      select: { averageRating: true, totalReviews: true },
                    },
                  },
                },
              },
            },
          },
        },
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return {
      event: activeEvent || null,
      items,
    };
  }

  async getSellerFlashSaleItems(tenantId: string) {
    return this.prisma.flashSaleItem.findMany({
      where: { tenantId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            price: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            basePrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
