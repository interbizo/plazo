import { Injectable, NotFoundException } from "@nestjs/common";
import { RatingType } from "@prisma/client";
import { PrismaService } from "@modules/database/prisma.service";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { ImageHelper } from "@common/utils/image.helper";
import { CategoryHelper } from "@common/helpers/category.helper";
import { PublicSearchDto, SortBy } from "./public-marketplace.dto";

@Injectable()
export class PublicMarketplaceService {
  constructor(private prisma: PrismaService) {}

  private async attachServiceStats<
    T extends { id: string }
  >(services: T[]) {
    if (services.length === 0) {
      return services.map((service) => ({
        ...service,
        averageRating: 0,
        totalReviews: 0,
        totalSales: 0,
      }));
    }

    const serviceIds = services.map((service) => service.id);

    const [reviewStats, salesStats] = await Promise.all([
      this.prisma.review.groupBy({
        by: ["serviceId"],
        where: {
          serviceId: { in: serviceIds },
        },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.order.groupBy({
        by: ["serviceId"],
        where: {
          serviceId: { in: serviceIds },
          status: "COMPLETED",
        },
        _count: { _all: true },
      }),
    ]);

    const reviewMap = new Map(
      reviewStats
        .filter((item) => item.serviceId)
        .map((item) => [
          item.serviceId as string,
          {
            averageRating: Math.round(((item._avg.rating || 0) as number) * 10) / 10,
            totalReviews: item._count._all,
          },
        ]),
    );

    const salesMap = new Map(
      salesStats
        .filter((item) => item.serviceId)
        .map((item) => [item.serviceId as string, item._count._all]),
    );

    return services.map((service) => {
      const review = reviewMap.get(service.id);
      const totalSales = salesMap.get(service.id) || 0;

      return {
        ...service,
        averageRating: review?.averageRating || 0,
        totalReviews: review?.totalReviews || 0,
        totalSales,
      };
    });
  }

  private getVariantListInclude() {
    return {
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }

  private getVariantDetailInclude() {
    return {
      variants: {
        where: { isActive: true },
        include: {
          options: {
            select: {
              id: true,
              optionName: true,
              optionValue: true,
            },
            orderBy: { id: "asc" as const },
          },
        },
        orderBy: [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }],
      },
    };
  }

  private withEffectiveProductStock<
    T extends { hasVariants?: boolean; stock: number; variants?: Array<{ stock: number; isActive?: boolean | null }> }
  >(product: T): T {
    if (!product.hasVariants) {
      return product;
    }

    const variantStock = (product.variants || [])
      .filter((variant) => variant.isActive !== false)
      .reduce((total, variant) => total + (variant.stock || 0), 0);

    return {
      ...product,
      stock: variantStock,
    };
  }

  /**
   * Browse all products across all tenants (public marketplace homepage)
   */
  async browseProducts(query: PublicSearchDto) {
    const { skip, take } = PaginationHelper.calculatePagination(
      query.page || 1,
      query.limit || 20,
    );

    const where: any = {
      isPublished: true,
      publishToMarketplace: true,
      deletedAt: null,
      tenant: { isActive: true },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { tags: { hasSome: [query.search] } },
      ];
    }

    if (query.city) {
      const cityFilter = { contains: query.city, mode: "insensitive" as const };
      if (!where.AND) where.AND = [];
      if (!Array.isArray(where.AND)) where.AND = [where.AND];
      (where.AND as any[]).push({
        OR: [
          { city: cityFilter },
          { tenant: { city: cityFilter } },
        ],
      });
    }

    // Enhanced category filtering: include subcategories
    if (query.categoryId) {
      const categoryIds = await CategoryHelper.getAllCategoryIdsIncludingChildren(
        this.prisma,
        query.categoryId,
      );
      where.categoryId = { in: categoryIds };
    } else if (query.categorySlug) {
      const categoryIds = await CategoryHelper.getCategoryIdsFromSlug(
        this.prisma,
        query.categorySlug,
        'PRODUCT',
      );
      if (categoryIds) {
        where.categoryId = { in: categoryIds };
      } else {
        // Category not found, return empty result
        return PaginationHelper.formatPaginatedResponse(
          [],
          0,
          query.page || 1,
          query.limit || 20,
        );
      }
    }
    
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }
    if (query.tags) {
      where.tags = { hasSome: query.tags.split(",").map((t) => t.trim()) };
    }

    const orderBy = this.getOrderBy(query.sortBy, "price");

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } },
          ...this.getVariantListInclude(),
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              logo: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  lastActiveAt: true,
                  sellerProfile: {
                    select: { averageRating: true, totalReviews: true },
                  },
                },
              },
            },
          },
          reviews: {
            select: { rating: true },
          },
          orderItems: {
            where: {
              order: { status: 'COMPLETED' },
            },
            select: { id: true },
          },
        },
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Calculate rating and sales for each product (optimized - no extra queries)
    const productsWithStats = products.map((product) => {
      const reviews = product.reviews || [];
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      const totalSales = product.orderItems?.length || 0;

      // Remove reviews and orderItems from response to keep it clean
      const { reviews: _, orderItems: __, ...productData } = product as any;

      return {
        ...this.withEffectiveProductStock(productData),
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews: reviews.length,
        totalSales,
      };
    });

    // Apply in-memory sorting for rating/popular/best_seller
    let sortedProducts = productsWithStats;
    if (query.sortBy === SortBy.RATING || query.sortBy === SortBy.POPULAR) {
      sortedProducts = [...productsWithStats].sort((a, b) => {
        // Boosted items ALWAYS first (TopAds)
        const aBoosted = a.isBoosted ? 1 : 0;
        const bBoosted = b.isBoosted ? 1 : 0;
        if (bBoosted !== aBoosted) return bBoosted - aBoosted;
        // Then by rating within each group
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalReviews - a.totalReviews;
      });
    } else if (query.sortBy === SortBy.BEST_SELLER) {
      sortedProducts = [...productsWithStats].sort((a, b) => {
        // Boosted items ALWAYS first (TopAds)
        const aBoosted = a.isBoosted ? 1 : 0;
        const bBoosted = b.isBoosted ? 1 : 0;
        if (bBoosted !== aBoosted) return bBoosted - aBoosted;
        // Then by sales within each group
        if (b.totalSales !== a.totalSales) {
          return b.totalSales - a.totalSales;
        }
        return b.averageRating - a.averageRating;
      });
    }

    return PaginationHelper.formatPaginatedResponse(
      sortedProducts,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Browse all services across all tenants
   */
  async browseServices(query: PublicSearchDto) {
    const { skip, take } = PaginationHelper.calculatePagination(
      query.page || 1,
      query.limit || 20,
    );

    const where: any = {
      isPublished: true,
      publishToMarketplace: true,
      deletedAt: null,
      tenant: { isActive: true },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { tags: { hasSome: [query.search] } },
      ];
    }

    if (query.city) {
      const cityFilter = { contains: query.city, mode: "insensitive" as const };
      if (!where.AND) where.AND = [];
      if (!Array.isArray(where.AND)) where.AND = [where.AND];
      (where.AND as any[]).push({
        OR: [
          { city: cityFilter },
          { tenant: { city: cityFilter } },
        ],
      });
    }

    // Enhanced category filtering: include subcategories
    if (query.categoryId) {
      const categoryIds = await CategoryHelper.getAllCategoryIdsIncludingChildren(
        this.prisma,
        query.categoryId,
      );
      where.categoryId = { in: categoryIds };
    } else if (query.categorySlug) {
      const categoryIds = await CategoryHelper.getCategoryIdsFromSlug(
        this.prisma,
        query.categorySlug,
        'SERVICE',
      );
      if (categoryIds) {
        where.categoryId = { in: categoryIds };
      } else {
        // Category not found, return empty result
        return PaginationHelper.formatPaginatedResponse(
          [],
          0,
          query.page || 1,
          query.limit || 20,
        );
      }
    }
    
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.basePrice = {};
      if (query.minPrice !== undefined) where.basePrice.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.basePrice.lte = query.maxPrice;
    }
    if (query.tags) {
      where.tags = { hasSome: query.tags.split(",").map((t) => t.trim()) };
    }

    const orderBy = this.getOrderBy(query.sortBy, "basePrice");

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true, parentId: true } },
          packages: {
            orderBy: { tier: "asc" as const },
            take: 3,
          },
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              logo: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                  lastActiveAt: true,
                  sellerProfile: {
                    select: { averageRating: true, totalReviews: true },
                  },
                },
              },
            },
          },
        },
        orderBy,
      }),
      this.prisma.service.count({ where }),
    ]);

    const servicesWithStats = await this.attachServiceStats(services);

    // Apply in-memory sorting for rating/popular/best_seller
    let sortedServices = servicesWithStats;
    if (query.sortBy === SortBy.RATING || query.sortBy === SortBy.POPULAR) {
      sortedServices = [...servicesWithStats].sort((a, b) => {
        // Boosted items ALWAYS first (TopAds)
        const aBoosted = (a as any).isBoosted ? 1 : 0;
        const bBoosted = (b as any).isBoosted ? 1 : 0;
        if (bBoosted !== aBoosted) return bBoosted - aBoosted;
        // Then by rating within each group
        if (b.averageRating !== a.averageRating) {
          return b.averageRating - a.averageRating;
        }
        return b.totalReviews - a.totalReviews;
      });
    } else if (query.sortBy === SortBy.BEST_SELLER) {
      sortedServices = [...servicesWithStats].sort((a, b) => {
        // Boosted items ALWAYS first (TopAds)
        const aBoosted = (a as any).isBoosted ? 1 : 0;
        const bBoosted = (b as any).isBoosted ? 1 : 0;
        if (bBoosted !== aBoosted) return bBoosted - aBoosted;
        // Then by sales within each group
        if (b.totalSales !== a.totalSales) {
          return b.totalSales - a.totalSales;
        }
        return b.averageRating - a.averageRating;
      });
    }

    return PaginationHelper.formatPaginatedResponse(
      sortedServices,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Browse all open jobs across all tenants
   */
  async browseJobs(query: PublicSearchDto) {
    const { skip, take } = PaginationHelper.calculatePagination(
      query.page || 1,
      query.limit || 20,
    );

    const where: any = {
      status: "OPEN",
      deletedAt: null,
      tenant: { isActive: true },
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { tags: { hasSome: [query.search] } },
      ];
    }

    if (query.city) {
      const cityFilter = { contains: query.city, mode: "insensitive" as const };
      if (!where.AND) where.AND = [];
      if (!Array.isArray(where.AND)) where.AND = [where.AND];
      (where.AND as any[]).push({
        OR: [
          { city: cityFilter },
          { tenant: { city: cityFilter } },
        ],
      });
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.budget = {};
      if (query.minPrice !== undefined) where.budget.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.budget.lte = query.maxPrice;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          tenant: {
            select: { id: true, name: true, subdomain: true },
          },
          _count: { select: { proposals: true } },
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.job.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      jobs,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Browse sellers/stores
   */
  async browseSellers(page: number = 1, limit: number = 20, search?: string, city?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      isActive: true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (city) {
      const cityFilter = { contains: city, mode: "insensitive" as const };
      if (!where.AND) where.AND = [];
      if (!Array.isArray(where.AND)) where.AND = [where.AND];
      (where.AND as any[]).push({
        city: cityFilter,
      });
    }

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          subdomain: true,
          description: true,
          logo: true,
          banner: true,
          isVerified: true,
          isFeatured: true,
          subscriptionPlan: true,
          themeColor: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              lastActiveAt: true,
              sellerProfile: {
                select: {
                  averageRating: true,
                  totalReviews: true,
                  totalOrders: true,
                  skills: true,
                  level: true,
                },
              },
            },
          },
          _count: { select: { products: true, services: true } },
        },
        orderBy: [
          { isFeatured: "desc" },
          { isVerified: "desc" },
          { createdAt: "desc" },
        ],
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      tenants,
      total,
      page,
      limit,
    );
  }

  /**
   * Get homepage featured data
   */
  async getHomepageData() {
    const [
      featuredProducts,
      featuredServices,
      latestJobs,
      topSellers,
      verifiedStores,
      categories,
      stats,
    ] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          isPublished: true,
          deletedAt: null,
          isBoosted: true,
          tenant: { isActive: true },
        },
        take: 8,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          ...this.getVariantListInclude(),
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              logo: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.findMany({
        where: {
          isPublished: true,
          deletedAt: null,
          isBoosted: true,
          tenant: { isActive: true },
        },
        take: 8,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          packages: { orderBy: { tier: "asc" }, take: 1 },
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              logo: true,
              isVerified: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.job.findMany({
        where: { status: "OPEN", deletedAt: null },
        take: 6,
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { proposals: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.sellerProfile.findMany({
        where: { averageRating: { gte: 4 } },
        take: 8,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              tenants: {
                select: {
                  id: true,
                  name: true,
                  subdomain: true,
                  logo: true,
                  isVerified: true,
                  subscriptionPlan: true,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: [{ averageRating: "desc" }, { totalOrders: "desc" }],
      }),
      // Featured/Verified Stores - Premium sellers shown on homepage
      this.prisma.tenant.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          isFeatured: true,
          isVerified: true,
        },
        take: 12,
        select: {
          id: true,
          name: true,
          subdomain: true,
          description: true,
          logo: true,
          banner: true,
          isVerified: true,
          subscriptionPlan: true,
          themeColor: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              lastActiveAt: true,
              sellerProfile: {
                select: {
                  averageRating: true,
                  totalReviews: true,
                  totalOrders: true,
                  level: true,
                },
              },
            },
          },
          _count: { select: { products: true, services: true } },
        },
        orderBy: [{ featuredOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.category.findMany({
        where: {
          isActive: true,
          parentId: null, // Only get root categories for homepage
        },
        include: {
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
                include: {
                  _count: { select: { products: true, services: true } },
                },
              },
              _count: { select: { products: true, services: true, children: true } },
            },
          },
          _count: { select: { products: true, services: true, children: true } },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.getMarketplaceStats(),
    ]);

    const normalizedFeaturedProducts = featuredProducts.map((product) =>
      this.withEffectiveProductStock(product),
    );

    const normalizedFeaturedServices = await this.attachServiceStats(
      featuredServices,
    );

    return {
      featuredProducts: normalizedFeaturedProducts,
      featuredServices: normalizedFeaturedServices,
      latestJobs,
      topSellers,
      verifiedStores,
      categories,
      stats,
    };
  }

  /**
   * Get marketplace stats
   */
  private async getMarketplaceStats() {
    const [totalProducts, totalServices, totalSellers, totalJobs] =
      await Promise.all([
        this.prisma.product.count({
          where: { isPublished: true, deletedAt: null },
        }),
        this.prisma.service.count({
          where: { isPublished: true, deletedAt: null },
        }),
        this.prisma.tenant.count({
          where: { isActive: true, deletedAt: null },
        }),
        this.prisma.job.count({ where: { status: "OPEN", deletedAt: null } }),
      ]);

    return { totalProducts, totalServices, totalSellers, totalJobs };
  }

  /**
   * SEO meta data for dynamic pages (supports both id and slug)
   */
  async getSeoMeta(type: string, identifier: string) {
    switch (type) {
      case "product": {
        const product = await this.prisma.product.findFirst({
          where: {
            OR: [{ id: identifier }, { slug: identifier }],
            deletedAt: null,
          },
          include: {
            category: { select: { name: true } },
            tenant: { select: { name: true, subdomain: true } },
          },
        });
        if (!product) return null;
        return {
          title: product.metaTitle || `${product.name} - ${product.tenant.name}`,
          description: product.metaDescription || product.description.substring(0, 160),
          keywords: product.tags.join(", "),
          ogImage: product.thumbnail || product.images[0],
          canonicalUrl: `/${product.tenant.subdomain}/products/${product.slug || product.id}`,
        };
      }
      case "service": {
        const service = await this.prisma.service.findFirst({
          where: {
            OR: [{ id: identifier }, { slug: identifier }],
            deletedAt: null,
          },
          include: {
            category: { select: { name: true } },
            tenant: { select: { name: true, subdomain: true } },
          },
        });
        if (!service) return null;
        return {
          title: service.metaTitle || `${service.name} - ${service.tenant.name}`,
          description: service.metaDescription || service.description.substring(0, 160),
          keywords: service.tags.join(", "),
          ogImage: service.thumbnail,
          canonicalUrl: `/${service.tenant.subdomain}/services/${service.slug || service.id}`,
        };
      }
      case "seller": {
        const tenant = await this.prisma.tenant.findFirst({
          where: { subdomain: identifier, isActive: true },
          include: {
            owner: {
              select: {
                firstName: true,
                lastName: true,
                sellerProfile: {
                  select: { averageRating: true, totalReviews: true },
                },
              },
            },
          },
        });
        if (!tenant) return null;
        return {
          title: `${tenant.name} - Marketplace`,
          description:
            tenant.description?.substring(0, 160) || `${tenant.name} store`,
          keywords: `${tenant.name}, marketplace, seller`,
          ogImage: tenant.logo || tenant.banner,
          canonicalUrl: `/${tenant.subdomain}`,
        };
      }
      case "job": {
        const job = await this.prisma.job.findFirst({
          where: {
            OR: [{ id: identifier }, { slug: identifier }],
            deletedAt: null,
          },
        });
        if (!job) return null;
        return {
          title: job.metaTitle || job.title,
          description: job.metaDescription || job.description.substring(0, 160),
          keywords: job.tags.join(", "),
          canonicalUrl: `/jobs/${job.slug || job.id}`,
        };
      }
      default:
        return {
          title: "Plazo Marketplace",
          description:
            "Multi-tenant SaaS Marketplace for products, services, and freelance work",
          keywords: "marketplace, freelance, products, services",
        };
    }
  }

  private getOrderBy(sortBy: SortBy | undefined, priceField: string) {
    switch (sortBy) {
      case SortBy.PRICE_LOW:
        return [{ isBoosted: "desc" as const }, { [priceField]: "asc" as const }];
      case SortBy.PRICE_HIGH:
        return [{ isBoosted: "desc" as const }, { [priceField]: "desc" as const }];
      case SortBy.NEWEST:
        return [{ isBoosted: "desc" as const }, { createdAt: "desc" as const }];
      case SortBy.RATING:
      case SortBy.POPULAR:
      case SortBy.BEST_SELLER:
        // For rating/popular/best_seller, we'll sort in-memory after fetching
        // because these require aggregated data from relations
        return [{ isBoosted: "desc" as const }, { createdAt: "desc" as const }];
      default:
        return [{ isBoosted: "desc" as const }, { createdAt: "desc" as const }];
    }
  }

  // ============================================
  // STOREFRONT API (per subdomain)
  // ============================================

  /**
   * Get full storefront data for a subdomain.
   * This powers the seller's own web page (seller1.plazo.com)
   */
  async getStorefront(subdomain: string) {
    // Validate subdomain format to prevent spam/bot requests
    if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
      throw new NotFoundException('Invalid store subdomain');
    }

    // Check for suspicious patterns (bot/scanner requests)
    const suspiciousPatterns = [
      /^[0-9a-f]{8,}$/i, // Long hex strings
      /\.(php|asp|jsp|cgi)$/i, // File extensions
      /[<>'"\\]/, // Special characters
      /_dc-mx\./i, // Known bot pattern
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(subdomain))) {
      // Don't log these to avoid spam, just return 404
      throw new NotFoundException('Store not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            kycStatus: true,
            lastActiveAt: true,
            accountStatus: true,
            sellerProfile: {
              select: {
                averageRating: true,
                totalReviews: true,
                totalOrders: true,
                skills: true,
                level: true,
                bio: true,
                website: true,
                linkedin: true,
                github: true,
                portfolio: true,
                portfolioFiles: true,
              },
            },
          },
        },
        storePages: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: { id: true, slug: true, title: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Store not found or inactive');
    }

    // Check if store owner is suspended — show specific message
    const ownerStatus = (tenant.owner as any)?.accountStatus;
    if (ownerStatus === "SUSPENDED" || ownerStatus === "UNDER_APPEAL") {
      throw new NotFoundException('STORE_SUSPENDED');
    }

    if (!tenant.isActive) {
      throw new NotFoundException('STORE_SUSPENDED');
    }

    // Get store stats and data in parallel
    const [products, services, reviews, categories] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
        take: 12,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          ...this.getVariantListInclude(),
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.service.findMany({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
        take: 12,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          packages: { orderBy: { tier: "asc" } },
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.review.findMany({
        where: { receiverId: tenant.owner.id },
        take: 10,
        include: {
          giver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Get unique categories for this store
      this.prisma.category.findMany({
        where: {
          OR: [
            {
              products: {
                some: {
                  tenantId: tenant.id,
                  isPublished: true,
                  deletedAt: null,
                },
              },
            },
            {
              services: {
                some: {
                  tenantId: tenant.id,
                  isPublished: true,
                  deletedAt: null,
                },
              },
            },
          ],
        },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const [productCount, serviceCount] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
      }),
    ]);

    const normalizedProducts = products.map((product) =>
      this.withEffectiveProductStock(product),
    );

    const sellerProfile = tenant.owner.sellerProfile;
    const storeAverageRating = sellerProfile?.averageRating || 0;
    const storeTotalReviews = sellerProfile?.totalReviews || 0;

    return {
      store: {
        ...tenant,
        owner: {
          ...tenant.owner,
          // Never expose kycStatus details, just verified or not
          isKycVerified: tenant.owner.kycStatus === "APPROVED",
          kycStatus: undefined,
        },
      },
      stats: {
        totalProducts: productCount,
        totalServices: serviceCount,
        totalReviews: storeTotalReviews,
        averageRating: storeAverageRating,
      },
      products: normalizedProducts,
      services: await this.attachServiceStats(services),
      reviews,
      categories,
    };
  }

  /**
   * Get store products with pagination (for storefront)
   */
  async getStoreProducts(subdomain: string, query: PublicSearchDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, isActive: true, ownerId: true },
    });
    if (!tenant) return null;
    if (!tenant.isActive) {
      throw new NotFoundException('STORE_SUSPENDED');
    }

    const { skip, take } = PaginationHelper.calculatePagination(
      query.page || 1,
      query.limit || 20,
    );

    const where: any = {
      tenantId: tenant.id,
      isPublished: true,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPrice !== undefined)
      where.price = { ...where.price, gte: query.minPrice };
    if (query.maxPrice !== undefined)
      where.price = { ...where.price, lte: query.maxPrice };

    const orderBy = this.getOrderBy(query.sortBy, "price");

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          ...this.getVariantListInclude(),
        },
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    const normalizedProducts = products.map((product) =>
      this.withEffectiveProductStock(product),
    );

    return PaginationHelper.formatPaginatedResponse(
      normalizedProducts,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Get store services with pagination (for storefront)
   */
  async getStoreServices(subdomain: string, query: PublicSearchDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { id: true, isActive: true },
    });
    if (!tenant) return null;
    if (!tenant.isActive) {
      throw new NotFoundException('STORE_SUSPENDED');
    }

    const { skip, take } = PaginationHelper.calculatePagination(
      query.page || 1,
      query.limit || 20,
    );

    const where: any = {
      tenantId: tenant.id,
      isPublished: true,
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPrice !== undefined)
      where.basePrice = { ...where.basePrice, gte: query.minPrice };
    if (query.maxPrice !== undefined)
      where.basePrice = { ...where.basePrice, lte: query.maxPrice };

    const orderBy = this.getOrderBy(query.sortBy, "basePrice");

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          packages: { orderBy: { tier: "asc" } },
        },
        orderBy,
      }),
      this.prisma.service.count({ where }),
    ]);

    const servicesWithStats = await this.attachServiceStats(services);

    return PaginationHelper.formatPaginatedResponse(
      servicesWithStats,
      total,
      query.page || 1,
      query.limit || 20,
    );
  }

  /**
   * Get store reviews with pagination
   */
  async getStoreReviews(subdomain: string, page = 1, limit = 10) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { ownerId: true, isActive: true },
    });
    if (!tenant || !tenant.isActive) return null;

    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where = { receiverId: tenant.ownerId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          giver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      reviews,
      total,
      page,
      limit,
    );
  }

  async getStoreProductBySlug(subdomain: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        isPublished: true,
        deletedAt: null,
        tenant: { subdomain, isActive: true, deletedAt: null },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        ...this.getVariantDetailInclude(),
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            logo: true,
            isVerified: true,
            contactWhatsapp: true,
            subscriptionPlan: true,
            sellerTier: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                lastActiveAt: true,
                sellerProfile: { select: { averageRating: true, totalReviews: true } },
              },
            },
          },
        },
      },
    });

    if (!product) return null;

    const [reviewStats, totalSales] = await Promise.all([
      this.prisma.review.aggregate({
        where: {
          productId: product.id,
          type: RatingType.SELLER_RATING,
        },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.orderItem.count({
        where: {
          productId: product.id,
          order: { status: "COMPLETED" },
        },
      }),
    ]);

    const normalizedProduct = this.withEffectiveProductStock(product);

    return {
      product: {
        ...normalizedProduct,
        averageRating: Math.round((reviewStats._avg.rating || 0) * 10) / 10,
        totalReviews: reviewStats._count,
        totalSales,
        lazyImages: ImageHelper.processImagesForLazyLoad(normalizedProduct.images),
      },
      seo: {
        title: (normalizedProduct as any).metaTitle || `${normalizedProduct.name} - ${normalizedProduct.tenant.name}`,
        description: (normalizedProduct as any).metaDescription || normalizedProduct.description.substring(0, 160),
        keywords: normalizedProduct.tags.join(", "),
        ogImage: normalizedProduct.thumbnail || normalizedProduct.images[0],
        canonicalUrl: `/${normalizedProduct.tenant.subdomain}/products/${normalizedProduct.slug}`,
      },
    };
  }

  async getStoreServiceBySlug(subdomain: string, slug: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        slug,
        isPublished: true,
        deletedAt: null,
        tenant: { subdomain, isActive: true, deletedAt: null },
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        packages: { orderBy: { tier: "asc" } },
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            logo: true,
            isVerified: true,
            contactWhatsapp: true,
            subscriptionPlan: true,
            sellerTier: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                lastActiveAt: true,
                sellerProfile: { select: { averageRating: true, totalReviews: true } },
              },
            },
          },
        },
      },
    });

    if (!service) return null;

    // Parse FAQ — handle various storage formats
    let parsedFaq: any[] = [];
    const rawFaq = service.faq;
    
    if (rawFaq) {
      let faqData = rawFaq;
      if (typeof faqData === 'string') {
        try {
          faqData = JSON.parse(faqData);
          if (typeof faqData === 'string') {
            faqData = JSON.parse(faqData);
          }
        } catch (e) {
          console.error('[Store Service] Failed to parse FAQ JSON:', e);
          faqData = [];
        }
      }
      
      if (Array.isArray(faqData)) {
        parsedFaq = faqData
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => ({
            question: item.question || item.q || item.title || "",
            answer: item.answer || item.a || item.content || item.body || "",
          }))
          .filter((item: any) => item.question || item.answer);
      }
    }

    const [serviceWithStats] = await this.attachServiceStats([{
      ...service,
      faq: parsedFaq,
    }]);

    return {
      service: serviceWithStats,
      seo: {
        title: (serviceWithStats as any).metaTitle || `${serviceWithStats.name} - ${serviceWithStats.tenant.name}`,
        description: (serviceWithStats as any).metaDescription || serviceWithStats.description.substring(0, 160),
        keywords: serviceWithStats.tags.join(", "),
        ogImage: serviceWithStats.thumbnail,
        canonicalUrl: `/${serviceWithStats.tenant.subdomain}/services/${serviceWithStats.slug}`,
      },
    };
  }

  async getStorePageBySlug(subdomain: string, slug: string) {
    const page = await this.prisma.storePage.findFirst({
      where: {
        slug,
        isPublished: true,
        tenant: {
          subdomain,
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        updatedAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            logo: true,
            banner: true,
            description: true,
            isVerified: true,
            themeColor: true,
            themeSecondary: true,
            themePreset: true,
            themeFontFamily: true,
            themeBorderRadius: true,
            themeShadowStyle: true,
          },
        },
      },
    });

    if (!page) return null;

    return {
      page,
      store: page.tenant,
      seo: {
        title: page.metaTitle || `${page.title} - ${page.tenant.name}`,
        description: page.metaDescription || page.excerpt || page.tenant.description || "",
      },
    };
  }

  /**
   * Get public product detail by slug (SEO-friendly)
   */
  async getPublicProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isPublished: true, deletedAt: null, tenant: { isActive: true } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        ...this.getVariantDetailInclude(),
        tenant: {
          select: {
            id: true, name: true, subdomain: true, logo: true, isVerified: true,
            contactWhatsapp: true,
            subscriptionPlan: true,
            sellerTier: true,
            owner: {
              select: {
                id: true, firstName: true, lastName: true, avatar: true, lastActiveAt: true,
                sellerProfile: { select: { averageRating: true, totalReviews: true } },
              },
            },
          },
        },
      },
    });
    if (!product) return null;
    const [reviewStats, totalSales] = await Promise.all([
      this.prisma.review.aggregate({
        where: {
          productId: product.id,
          type: RatingType.SELLER_RATING,
        },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.orderItem.count({
        where: {
          productId: product.id,
          order: { status: "COMPLETED" },
        },
      }),
    ]);
    const normalizedProduct = this.withEffectiveProductStock(product);
    return {
      product: {
        ...normalizedProduct,
        averageRating: Math.round((reviewStats._avg.rating || 0) * 10) / 10,
        totalReviews: reviewStats._count,
        totalSales,
        lazyImages: ImageHelper.processImagesForLazyLoad(normalizedProduct.images),
      },
      seo: {
        title: (normalizedProduct as any).metaTitle || `${normalizedProduct.name} - ${normalizedProduct.tenant.name}`,
        description: (normalizedProduct as any).metaDescription || normalizedProduct.description.substring(0, 160),
        keywords: normalizedProduct.tags.join(", "),
        ogImage: normalizedProduct.thumbnail || normalizedProduct.images[0],
        canonicalUrl: `/${normalizedProduct.tenant.subdomain}/products/${normalizedProduct.slug}`,
      },
    };
  }

  /**
   * Get public service detail by slug (SEO-friendly)
   */
  async getPublicServiceBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, isPublished: true, deletedAt: null, tenant: { isActive: true } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        packages: { orderBy: { tier: "asc" } },
        tenant: {
          select: {
            id: true, name: true, subdomain: true, logo: true, isVerified: true,
            contactWhatsapp: true,
            subscriptionPlan: true,
            sellerTier: true,
            owner: {
              select: {
                id: true, firstName: true, lastName: true, avatar: true, lastActiveAt: true,
                sellerProfile: { select: { averageRating: true, totalReviews: true } },
              },
            },
          },
        },
      },
    });
    if (!service) return null;
    
    // Parse FAQ — handle various storage formats
    let parsedFaq: any[] = [];
    const rawFaq = service.faq;
    
    if (rawFaq) {
      // If it's a string, try to parse it (could be double-encoded)
      let faqData = rawFaq;
      if (typeof faqData === 'string') {
        try {
          faqData = JSON.parse(faqData);
          // Check if it's still a string (double-encoded)
          if (typeof faqData === 'string') {
            faqData = JSON.parse(faqData);
          }
        } catch (e) {
          console.error('[Public Service] Failed to parse FAQ JSON:', e);
          faqData = [];
        }
      }
      
      // Ensure it's an array
      if (Array.isArray(faqData)) {
        // Normalize FAQ items — ensure question/answer fields exist
        parsedFaq = faqData
          .filter((item: any) => item && typeof item === 'object')
          .map((item: any) => ({
            question: item.question || item.q || item.title || "",
            answer: item.answer || item.a || item.content || item.body || "",
          }))
          .filter((item: any) => item.question || item.answer);
      }
    }
    
    const [serviceWithStats] = await this.attachServiceStats([{
      ...service,
      faq: parsedFaq,
    }]);
    
    return {
      service: serviceWithStats,
      seo: {
        title: (serviceWithStats as any).metaTitle || `${serviceWithStats.name} - ${serviceWithStats.tenant.name}`,
        description: (serviceWithStats as any).metaDescription || serviceWithStats.description.substring(0, 160),
        keywords: serviceWithStats.tags.join(", "),
        ogImage: serviceWithStats.thumbnail,
        canonicalUrl: `/${serviceWithStats.tenant.subdomain}/services/${serviceWithStats.slug}`,
      },
    };
  }

  /**
   * Get public job detail by slug (SEO-friendly)
   */
  async getPublicJobBySlug(slug: string) {
    const job = await this.prisma.job.findFirst({
      where: { slug, status: "OPEN", deletedAt: null, tenant: { isActive: true } },
      include: {
        buyer: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        tenant: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            contactWhatsapp: true,
            subscriptionPlan: true,
            sellerTier: true,
            ownerId: true,
          },
        },
        _count: { select: { proposals: true } },
      },
    });
    if (!job) return null;
    return {
      job,
      seo: {
        title: (job as any).metaTitle || job.title,
        description: (job as any).metaDescription || job.description.substring(0, 160),
        keywords: job.tags.join(", "),
        canonicalUrl: `/jobs/${job.slug}`,
      },
    };
  }

  /**
   * Get store navigation menus (public)
   */
  async getStoreMenus(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!tenant) {
      throw new NotFoundException("Store not found");
    }

    const menus = await this.prisma.storeMenu.findMany({
      where: {
        tenantId: tenant.id,
        isVisible: true,
      },
      include: {
        children: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Return only top-level menus
    const topLevelMenus = menus.filter((m: any) => !m.parentId);

    return { menus: topLevelMenus };
  }

  /**
   * Get seller portfolio (public)
   */
  async getSellerPortfolio(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { portfolio: true, portfolioFiles: true },
    });

    if (!profile) {
      throw new NotFoundException("Seller profile not found");
    }

    // portfolio is stored as JSON string array of items
    let items: any[] = [];
    try {
      items = profile.portfolio ? JSON.parse(profile.portfolio) : [];
    } catch {
      items = [];
    }

    // Return array directly for consistency
    return items;
  }
}
