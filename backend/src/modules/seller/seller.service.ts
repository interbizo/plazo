import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { UpdateSellerProfileDto, UpdateStoreSettingsDto } from "./seller.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";

@Injectable()
export class SellerService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        tenants: { where: { deletedAt: null } },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // If no seller profile, create one
    if (!user.sellerProfile) {
      const newProfile = await this.prisma.sellerProfile.create({
        data: {
          userId: userId,
          level: "NEW",
          totalEarnings: 0,
          totalOrders: 0,
          averageRating: 0,
          totalReviews: 0,
        },
      });
      user.sellerProfile = newProfile;
    }

    const tenant = user.tenants?.[0];

    // If no tenant, return empty dashboard
    if (!tenant) {
      return {
        profile: user.sellerProfile,
        tenant: null,
        stats: {
          totalProducts: 0,
          totalServices: 0,
          averageRating: user.sellerProfile?.averageRating || 0,
          totalReviews: user.sellerProfile?.totalReviews || 0,
        },
        recentReviews: [],
      };
    }

    const [
      totalProducts,
      totalServices,
      recentReviews,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
      this.prisma.review.findMany({
        where: { receiverId: userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          giver: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      }),
    ]);

    return {
      profile: user.sellerProfile,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        subscriptionPlan: tenant.subscriptionPlan,
        postsLimit: tenant.postsLimit,
        usedPosts: tenant.usedPosts,
      },
      stats: {
        totalProducts,
        totalServices,
        averageRating: user.sellerProfile?.averageRating || 0,
        totalReviews: user.sellerProfile?.totalReviews || 0,
      },
      recentReviews,
    };
  }

  /* DISABLED - fitur dihapus
  async getEarnings(userId: string, period: string = "30d") {
    const days =
      period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // BUG-12: Use ESCROW_RELEASE transactions instead of raw order amounts
    // to accurately reflect earnings after platform fee deduction
    const escrowReleases = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: "ESCROW_RELEASE",
        status: "COMPLETED",
        createdAt: { gte: since },
      },
      _sum: { netAmount: true },
      _count: true,
    });

    const orders = await this.prisma.order.findMany({
      where: {
        sellerId: userId,
        status: "COMPLETED",
        completedAt: { gte: since },
      },
      select: {
        amount: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { completedAt: "asc" },
    });

    const PLATFORM_FEE_RATE = 0.1; // 10%
    const grossEarnings = orders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Prefer actual ESCROW_RELEASE sum; fall back to calculated net if no transactions yet
    const totalEarnings =
      escrowReleases._sum.netAmount != null
        ? escrowReleases._sum.netAmount
        : grossEarnings * (1 - PLATFORM_FEE_RATE);

    const platformFees = grossEarnings - totalEarnings;

    return {
      period,
      totalEarnings,
      grossEarnings,
      platformFees,
      orderCount: orders.length,
      orders: orders.map((o) => ({
        ...o,
        netAmount: (o.amount || 0) * (1 - PLATFORM_FEE_RATE),
      })),
    };
  }
  */

  async updateProfile(userId: string, dto: UpdateSellerProfileDto) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Seller profile not found");
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data: dto,
    });
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Seller profile not found");
    }

    // Fetch user's lastActiveAt for online status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveAt: true },
    });

    return {
      ...profile,
      lastActiveAt: user?.lastActiveAt || null,
    };
  }

  async getSellerProducts(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("No store found");
    }

    const skip = (page - 1) * limit;
    const searchTerm = search?.trim();
    const where: any = { tenantId: tenant.id, deletedAt: null };

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { category: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: { select: { id: true, name: true } },
          variants: {
            select: {
              id: true,
              stock: true,
              isActive: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({
        where,
      }),
    ]);

    const normalizedProducts = products.map((product: any) => ({
      ...product,
      stock: product.hasVariants
        ? (product.variants || [])
            .filter((variant: any) => variant.isActive)
            .reduce(
              (totalStock: number, variant: any) => totalStock + (variant.stock || 0),
              0,
            )
        : product.stock,
    }));

    return {
      data: normalizedProducts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getSellerProduct(userId: string, productId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("No store found");
    }

    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        tenantId: tenant.id,
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        variants: {
          include: {
            options: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return { data: product };
  }

  async getSellerServices(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("No store found");
    }

    const skip = (page - 1) * limit;
    const searchTerm = search?.trim();
    const where: any = { tenantId: tenant.id, deletedAt: null };

    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { category: { name: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({
        where,
      }),
    ]);

    return {
      data: services,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getSellerService(userId: string, serviceId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("No store found");
    }

    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        tenantId: tenant.id,
        deletedAt: null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        packages: {
          orderBy: { price: "asc" },
        },
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return { data: service };
  }

  /* DISABLED - fitur dihapus
  async getSellerOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    // Ensure page and limit are valid numbers
    const validPage = Math.max(1, Number(page) || 1);
    const validLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (validPage - 1) * validLimit;

    const searchTerm = search?.trim();
    const where: any = { sellerId: userId, deletedAt: null };
    if (status) where.status = status;

    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { buyer: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        { buyer: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        { buyer: { email: { contains: searchTerm, mode: "insensitive" } } },
        { buyer: { phone: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: validLimit,
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              email: true,
              phone: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, name: true, thumbnail: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page: validPage,
      limit: validLimit,
      pages: Math.ceil(total / validLimit),
    };
  }
  */

  // ============ STORE SETTINGS ============

  async getStoreSettings(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            lastActiveAt: true,
          },
        },
        storePages: {
          where: { isPublished: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            sortOrder: true,
            isPublished: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException("No store found");

    return {
      id: tenant.id,
      subdomain: tenant.subdomain,
      // Owner Info
      owner: tenant.owner,
      // Basic Info
      name: tenant.name,
      description: tenant.description,
      tagline: tenant.tagline,
      logo: tenant.logo,
      banner: tenant.banner,
      favicon: tenant.favicon,
      // Contact
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      contactWhatsapp: tenant.contactWhatsapp,
      address: tenant.address,
      city: tenant.city,
      latitude: tenant.latitude,
      longitude: tenant.longitude,
      // Theme
      themeColor: tenant.themeColor,
      themeSecondary: tenant.themeSecondary,
      themePreset: tenant.themePreset,
      themeFontFamily: tenant.themeFontFamily,
      themeBorderRadius: tenant.themeBorderRadius,
      themeShadowStyle: tenant.themeShadowStyle,
      socialLinks: tenant.socialLinks,
      storeAnnouncement: tenant.storeAnnouncement,
      displayMode: tenant.displayMode,
      // SEO
      metaTitle: tenant.metaTitle,
      metaDescription: tenant.metaDescription,
      metaKeywords: tenant.metaKeywords,
      ogImage: tenant.ogImage,
      // Policies
      returnPolicy: tenant.returnPolicy,
      shippingPolicy: tenant.shippingPolicy,
      termsOfService: tenant.termsOfService,
      privacyPolicy: tenant.privacyPolicy,
      // Store Hours
      storeHours: tenant.storeHours,
      // Pinned
      pinnedProductIds: tenant.pinnedProductIds,
      pinnedServiceIds: tenant.pinnedServiceIds,
      // Status
      isVerified: tenant.isVerified,
      isFeatured: tenant.isFeatured,
      subscriptionPlan: tenant.subscriptionPlan,
      postsLimit: tenant.postsLimit,
      usedPosts: tenant.usedPosts,
      // CMS Pages
      storePages: tenant.storePages,
    };
  }

  async updateStoreSettings(userId: string, dto: UpdateStoreSettingsDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    // Build update data — only include fields that are explicitly provided
    const data: any = {};

    // Basic Info
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tagline !== undefined) data.tagline = dto.tagline;

    // Media
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.banner !== undefined) data.banner = dto.banner;
    if (dto.favicon !== undefined) data.favicon = dto.favicon;

    // Contact
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone;
    if (dto.contactWhatsapp !== undefined)
      data.contactWhatsapp = dto.contactWhatsapp;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    // Theme
    if (dto.themeColor !== undefined) data.themeColor = dto.themeColor;
    if (dto.themeSecondary !== undefined)
      data.themeSecondary = dto.themeSecondary;
    if (dto.themePreset !== undefined) data.themePreset = dto.themePreset;
    if (dto.themeFontFamily !== undefined)
      data.themeFontFamily = dto.themeFontFamily;
    if (dto.themeBorderRadius !== undefined)
      data.themeBorderRadius = dto.themeBorderRadius;
    if (dto.themeShadowStyle !== undefined)
      data.themeShadowStyle = dto.themeShadowStyle;
    if (dto.socialLinks !== undefined) data.socialLinks = dto.socialLinks;
    if (dto.storeAnnouncement !== undefined)
      data.storeAnnouncement = dto.storeAnnouncement;
    if (dto.displayMode !== undefined) data.displayMode = dto.displayMode;

    // SEO
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined)
      data.metaDescription = dto.metaDescription;
    if (dto.metaKeywords !== undefined) data.metaKeywords = dto.metaKeywords;
    if (dto.ogImage !== undefined) data.ogImage = dto.ogImage;

    // Policies
    if (dto.returnPolicy !== undefined) data.returnPolicy = dto.returnPolicy;
    if (dto.shippingPolicy !== undefined)
      data.shippingPolicy = dto.shippingPolicy;
    if (dto.termsOfService !== undefined)
      data.termsOfService = dto.termsOfService;
    if (dto.privacyPolicy !== undefined) data.privacyPolicy = dto.privacyPolicy;

    // Store Hours
    if (dto.storeHours !== undefined) data.storeHours = dto.storeHours;

    // Pinned items
    if (dto.pinnedProductIds !== undefined)
      data.pinnedProductIds = dto.pinnedProductIds;
    if (dto.pinnedServiceIds !== undefined)
      data.pinnedServiceIds = dto.pinnedServiceIds;

    const updated = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data,
    });

    return { message: "Pengaturan toko berhasil diperbarui", store: updated };
  }

  // ============ STORE PAGES CMS ============

  async getStorePages(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    return this.prisma.storePage.findMany({
      where: { tenantId: tenant.id },
      orderBy: { sortOrder: "asc" },
    });
  }

  async getStorePage(userId: string, pageId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    const page = await this.prisma.storePage.findFirst({
      where: { id: pageId, tenantId: tenant.id },
    });
    if (!page) throw new NotFoundException("Page not found");
    return page;
  }

  async createStorePage(userId: string, dto: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    // Check slug uniqueness within tenant
    const existing = await this.prisma.storePage.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: dto.slug } },
    });
    if (existing) {
      throw new BadRequestException(
        `Halaman dengan slug "${dto.slug}" sudah ada`,
      );
    }

    const page = await this.prisma.storePage.create({
      data: {
        tenantId: tenant.id,
        slug: dto.slug,
        title: dto.title,
        content: dto.content,
        excerpt: dto.excerpt,
        isPublished: dto.isPublished ?? true,
        sortOrder: dto.sortOrder ?? 0,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
      },
    });

    return { message: "Halaman berhasil dibuat", page };
  }

  async updateStorePage(userId: string, pageId: string, dto: any) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    const existing = await this.prisma.storePage.findFirst({
      where: { id: pageId, tenantId: tenant.id },
    });
    if (!existing) throw new NotFoundException("Page not found");

    const page = await this.prisma.storePage.update({
      where: { id: pageId },
      data: dto,
    });

    return { message: "Halaman berhasil diperbarui", page };
  }

  async deleteStorePage(userId: string, pageId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    const existing = await this.prisma.storePage.findFirst({
      where: { id: pageId, tenantId: tenant.id },
    });
    if (!existing) throw new NotFoundException("Page not found");

    await this.prisma.storePage.delete({ where: { id: pageId } });
    return { message: "Halaman berhasil dihapus" };
  }

  // ============ SELLER ANALYTICS ============

  /* DISABLED - fitur dihapus
  async getAnalytics(userId: string, period = "30d") {
    const days =
      period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    const [
      totalOrders,
      completedOrders,
      cancelledOrders,
      revenueStats,
      totalProducts,
      publishedProducts,
      totalServices,
      publishedServices,
      totalReviews,
      avgRating,
      totalWishlists,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { sellerId: userId, createdAt: { gte: since } },
      }),
      this.prisma.order.count({
        where: {
          sellerId: userId,
          status: "COMPLETED",
          createdAt: { gte: since },
        },
      }),
      this.prisma.order.count({
        where: {
          sellerId: userId,
          status: "CANCELLED",
          createdAt: { gte: since },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: "COMPLETED",
          createdAt: { gte: since },
        },
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      this.prisma.product.count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
      this.prisma.product.count({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { tenantId: tenant.id, deletedAt: null },
      }),
      this.prisma.service.count({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
      }),
      this.prisma.review.count({
        where: { receiverId: userId, createdAt: { gte: since } },
      }),
      this.prisma.review.aggregate({
        where: { receiverId: userId },
        _avg: { rating: true },
      }),
      this.prisma.wishlist.count({
        where: {
          product: { tenantId: tenant.id },
        },
      }),
    ]);

    const completionRate =
      totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

    return {
      period,
      orders: {
        total: totalOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        completionRate,
      },
      revenue: {
        total: revenueStats._sum.amount || 0,
        avgOrderValue: Math.round((revenueStats._avg.amount || 0) * 100) / 100,
      },
      listings: {
        totalProducts,
        publishedProducts,
        totalServices,
        publishedServices,
      },
      engagement: {
        totalReviews,
        averageRating: Math.round((avgRating._avg.rating || 0) * 100) / 100,
        totalWishlists,
      },
    };
  }
  */

  // ============ REVENUE & TRANSACTIONS ============

  /* DISABLED - fitur dihapus
  async getRevenueBreakdown(userId: string, period = "30d") {
    const days =
      period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      grossRevenue,
      platformFees,
      withdrawals,
      pendingWithdrawals,
      pendingEscrow,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: "PLATFORM_FEE", createdAt: { gte: since } },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: "COMPLETED", createdAt: { gte: since } },
        _sum: { netAmount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: "PENDING" },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: "PROCESSING",
          escrowReleasedAt: null,
        },
        _sum: { escrowAmount: true },
      }),
    ]);

    const gross = grossRevenue._sum.amount || 0;
    const fees = platformFees._sum.amount || 0;

    return {
      period,
      grossRevenue: gross,
      platformFees: fees,
      netRevenue: gross - fees,
      withdrawn: withdrawals._sum.netAmount || 0,
      pendingWithdrawals: {
        count: pendingWithdrawals._count,
        amount: pendingWithdrawals._sum.amount || 0,
      },
      pendingEscrow: pendingEscrow._sum.escrowAmount || 0,
    };
  }
  */

  /* DISABLED - fitur dihapus
  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { userId, ...(type && { type }) };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return PaginationHelper.formatResponse(transactions, total, page, limit);
  }
  */

  /* DISABLED - fitur dihapus
  async getWithdrawalHistory(userId: string, page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);

    return PaginationHelper.formatResponse(withdrawals, total, page, limit);
  }
  */

  /* DISABLED - fitur dihapus
  async getBalance(userId: string) {
    // Calculate total earnings from completed escrow releases
    const totalEarnings = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: "ESCROW_RELEASE",
        status: "COMPLETED",
      },
      _sum: { netAmount: true },
    });

    // Calculate total withdrawals (completed + processing)
    const totalWithdrawals = await this.prisma.withdrawal.aggregate({
      where: {
        userId,
        status: { in: ["COMPLETED", "PROCESSING", "APPROVED"] },
      },
      _sum: { amount: true },
    });

    // Calculate pending withdrawals
    const pendingWithdrawals = await this.prisma.withdrawal.aggregate({
      where: {
        userId,
        status: "PENDING",
      },
      _sum: { amount: true },
    });

    const earnings = totalEarnings._sum.netAmount || 0;
    const withdrawn = totalWithdrawals._sum.amount || 0;
    const pending = pendingWithdrawals._sum.amount || 0;
    const availableBalance = earnings - withdrawn;

    return {
      totalEarnings: earnings,
      totalWithdrawn: withdrawn,
      pendingWithdrawals: pending,
      availableBalance,
      currency: "IDR",
    };
  }
  */

  // ============ REVIEWS MANAGEMENT ============

  async getReceivedReviews(userId: string, page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { receiverId: userId },
        skip,
        take,
        include: {
          giver: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          order: {
            select: {
              id: true,
              title: true,
              serviceId: true,
              orderItems: {
                take: 1,
                select: {
                  product: {
                    select: { id: true, name: true, images: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: { receiverId: userId } }),
    ]);

    // Enrich reviews with product/service info
    const enrichedReviews = await Promise.all(
      reviews.map(async (review: any) => {
        let productName: string | null = null;
        let serviceName: string | null = null;
        let listingType: "product" | "service" | null = null;
        let productImage: string | null = null;

        if (review.order) {
          // Check if order has product items
          if (review.order.orderItems?.length > 0) {
            const item = review.order.orderItems[0];
            productName = item.product?.name || null;
            productImage = item.product?.images?.[0] || null;
            listingType = "product";
          }
          // Check if order is for a service
          if (review.order.serviceId) {
            const service = await this.prisma.service.findUnique({
              where: { id: review.order.serviceId },
              select: { id: true, name: true, gallery: true },
            });
            if (service) {
              serviceName = service.name;
              if (!productImage) {
                productImage = (service.gallery as string[])?.[0] || null;
              }
              listingType = "service";
            }
          }
        }

        return {
          ...review,
          productName,
          serviceName,
          listingType,
          listingName:
            productName || serviceName || review.order?.title || null,
          listingImage: productImage,
        };
      }),
    );

    return PaginationHelper.formatResponse(enrichedReviews, total, page, limit);
  }

  async getReviewStats(userId: string) {
    const [total, avg, grouped] = await Promise.all([
      this.prisma.review.count({ where: { receiverId: userId } }),
      this.prisma.review.aggregate({
        where: { receiverId: userId },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where: { receiverId: userId },
        _count: true,
      }),
    ]);

    const distributionMap = new Map(
      grouped.map((g: any) => [g.rating, g._count]),
    );
    const distribution = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: distributionMap.get(rating) || 0,
    }));

    return {
      total,
      averageRating: Math.round((avg._avg.rating || 0) * 100) / 100,
      distribution,
    };
  }

  // ============ PROPOSALS MANAGEMENT ============

  async getMyProposals(userId: string, page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      sellerId: userId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              budget: true,
              status: true,
              buyer: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return PaginationHelper.formatResponse(proposals, total, page, limit);
  }

  async getProposalStats(userId: string) {
    const baseWhere = { sellerId: userId, deletedAt: null };
    const [total, pending, accepted, rejected] = await Promise.all([
      this.prisma.proposal.count({ where: baseWhere }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: "PENDING" },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: "ACCEPTED" },
      }),
      this.prisma.proposal.count({
        where: { ...baseWhere, status: "REJECTED" },
      }),
    ]);

    return {
      total,
      pending,
      accepted,
      rejected,
      acceptRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    };
  }

  // ============ CUSTOM OFFERS ============

  /* DISABLED - fitur dihapus
  async getMyCustomOffers(userId: string, page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [offers, total] = await Promise.all([
      this.prisma.customOffer.findMany({
        where: { sellerId: userId },
        skip,
        take,
        include: {
          buyer: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customOffer.count({ where: { sellerId: userId } }),
    ]);

    return PaginationHelper.formatResponse(offers, total, page, limit);
  }
  */

  // ============ DISPUTES ============

  /* DISABLED - fitur dihapus
  async getSellerDisputes(userId: string, page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where: {
          order: { sellerId: userId },
        },
        skip,
        take,
        include: {
          order: {
            select: { id: true, amount: true, status: true },
          },
          openedBy: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.count({
        where: { order: { sellerId: userId } },
      }),
    ]);

    return PaginationHelper.formatResponse(disputes, total, page, limit);
  }
  */

  // ============ VERIFICATION & LEVEL STATUS ============

  async getVerificationStatus(userId: string) {
    const [user, profile, kycSubmission, tenant] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { kycStatus: true, kycVerifiedAt: true, isEmailVerified: true },
      }),
      this.prisma.sellerProfile.findUnique({
        where: { userId },
        select: {
          level: true,
          levelUpdatedAt: true,
          totalOrders: true,
          totalReviews: true,
          averageRating: true,
          totalEarnings: true,
        },
      }),
      this.prisma.kycSubmission.findUnique({
        where: { userId },
        select: {
          status: true,
          rejectionReason: true,
          submittedAt: true,
          verifiedAt: true,
        },
      }),
      this.prisma.tenant.findFirst({
        where: { ownerId: userId, deletedAt: null },
        select: {
          isVerified: true,
          verifiedAt: true,
          isFeatured: true,
          subscriptionPlan: true,
        },
      }),
    ]);

    if (!user) throw new NotFoundException("User not found");

    // Level progress
    const levelProgress = this.calculateLevelProgress(profile);

    return {
      email: { verified: user.isEmailVerified },
      kyc: {
        status: user.kycStatus,
        verifiedAt: user.kycVerifiedAt,
        submission: kycSubmission,
      },
      seller: {
        level: profile?.level || "NEW",
        levelUpdatedAt: profile?.levelUpdatedAt,
        nextLevel: levelProgress.nextLevel,
        progress: levelProgress.progress,
        requirements: levelProgress.requirements,
      },
      store: {
        isVerified: tenant?.isVerified || false,
        verifiedAt: tenant?.verifiedAt,
        isFeatured: tenant?.isFeatured || false,
        subscriptionPlan: tenant?.subscriptionPlan || "FREE",
      },
    };
  }

  private calculateLevelProgress(profile: any) {
    if (!profile)
      return { nextLevel: "LEVEL_1", progress: 0, requirements: {} };

    const levels = {
      NEW: {
        nextLevel: "LEVEL_1",
        requirements: {
          totalOrders: 10,
          averageRating: 4.0,
          totalEarnings: 1000000,
        },
      },
      LEVEL_1: {
        nextLevel: "LEVEL_2",
        requirements: {
          totalOrders: 50,
          averageRating: 4.5,
          totalEarnings: 10000000,
        },
      },
      LEVEL_2: {
        nextLevel: "TOP_RATED",
        requirements: {
          totalOrders: 100,
          averageRating: 4.7,
          totalEarnings: 50000000,
        },
      },
      TOP_RATED: {
        nextLevel: null,
        requirements: {},
      },
    };

    const current = levels[profile.level as keyof typeof levels] || levels.NEW;

    if (!current.nextLevel) {
      return { nextLevel: null, progress: 100, requirements: {} };
    }

    const reqs = current.requirements;
    const orderProgress = Math.min(
      (profile.totalOrders / (reqs.totalOrders || 1)) * 100,
      100,
    );
    const ratingProgress = Math.min(
      (profile.averageRating / (reqs.averageRating || 1)) * 100,
      100,
    );
    const earningsProgress = Math.min(
      (profile.totalEarnings / (reqs.totalEarnings || 1)) * 100,
      100,
    );
    const avgProgress = Math.round(
      (orderProgress + ratingProgress + earningsProgress) / 3,
    );

    return {
      nextLevel: current.nextLevel,
      progress: avgProgress,
      requirements: {
        orders: {
          current: profile.totalOrders,
          required: reqs.totalOrders,
          met: profile.totalOrders >= (reqs.totalOrders || 0),
        },
        rating: {
          current: profile.averageRating,
          required: reqs.averageRating,
          met: profile.averageRating >= (reqs.averageRating || 0),
        },
        earnings: {
          current: profile.totalEarnings,
          required: reqs.totalEarnings,
          met: profile.totalEarnings >= (reqs.totalEarnings || 0),
        },
      },
    };
  }

  // ============ NOTIFICATION PREFERENCES ============

  async getNotificationCount(userId: string) {
    const [unread, total] = await Promise.all([
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { unread, total };
  }

  // ============ ORDER ANALYTICS ============

  /* DISABLED - fitur dihapus
  async getOrderAnalytics(userId: string) {
    const [totalOrders, completed, cancelled, disputed, avgCompletionTime] =
      await Promise.all([
        this.prisma.order.count({ where: { sellerId: userId } }),
        this.prisma.order.count({
          where: { sellerId: userId, status: "COMPLETED" },
        }),
        this.prisma.order.count({
          where: { sellerId: userId, status: "CANCELLED" },
        }),
        this.prisma.order.count({
          where: { sellerId: userId, status: "DISPUTED" },
        }),
        this.prisma.order.findMany({
          where: {
            sellerId: userId,
            status: "COMPLETED",
            completedAt: { not: null },
          },
          select: { createdAt: true, completedAt: true },
        }),
      ]);

    // Calculate average completion time in days
    let avgDays = 0;
    if (avgCompletionTime.length > 0) {
      const totalDays = avgCompletionTime.reduce((sum, o) => {
        const diff =
          (o.completedAt!.getTime() - o.createdAt.getTime()) /
          (1000 * 60 * 60 * 24);
        return sum + diff;
      }, 0);
      avgDays = Math.round((totalDays / avgCompletionTime.length) * 10) / 10;
    }

    // Monthly breakdown (last 6 months) — single query using raw grouping
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyOrders, monthlyCompleted, monthlyRevenue] = await Promise.all(
      [
        this.prisma.order.findMany({
          where: { sellerId: userId, createdAt: { gte: sixMonthsAgo } },
          select: { createdAt: true, status: true, amount: true },
        }),
        Promise.resolve(null), // placeholder
        Promise.resolve(null), // placeholder
      ],
    );

    // Group in-memory (much faster than 18 separate DB queries)
    const monthlyMap = new Map<
      string,
      { orders: number; completed: number; revenue: number }
    >();
    for (let i = 5; i >= 0; i--) {
      const key = `${now.getFullYear()}-${String(now.getMonth() - i + 1).padStart(2, "0")}`;
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const actualKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(actualKey, { orders: 0, completed: 0, revenue: 0 });
    }

    for (const order of monthlyOrders) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.orders++;
        if (order.status === "COMPLETED") {
          entry.completed++;
          entry.revenue += order.amount || 0;
        }
      }
    }

    const monthlyBreakdown = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({
        month,
        orders: data.orders,
        completed: data.completed,
        revenue: data.revenue,
      }),
    );

    return {
      summary: {
        totalOrders,
        completed,
        cancelled,
        disputed,
        completionRate:
          totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0,
        cancellationRate:
          totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0,
        avgCompletionDays: avgDays,
      },
      monthlyBreakdown,
    };
  }
  */

  // ============ TOP LISTINGS ============

  /* DISABLED - fitur dihapus
  async getTopListings(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("No store found");

    const [topProducts, topServices] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          price: true,
          isPublished: true,
          _count: { select: { orderItems: true, wishlists: true } },
        },
        orderBy: { orderItems: { _count: "desc" } },
        take: 10,
      }),
      this.prisma.service.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          basePrice: true,
          isPublished: true,
          _count: { select: { packages: true } },
        },
        take: 10,
      }),
    ]);

    return { topProducts, topServices };
  }
  */

  // ============ PORTFOLIO CRUD ============

  async getPortfolio(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { portfolio: true, portfolioFiles: true },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    // portfolio is stored as JSON string array of items
    let items: any[] = [];
    try {
      items = profile.portfolio ? JSON.parse(profile.portfolio) : [];
    } catch {
      items = [];
    }
    // Return array directly for easier frontend consumption
    return items;
  }

  async addPortfolioItem(userId: string, dto: any) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { portfolio: true },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    let items: any[] = [];
    try {
      items = profile.portfolio ? JSON.parse(profile.portfolio) : [];
    } catch {
      items = [];
    }
    const newItem = {
      id: `pf_${Date.now()}`,
      ...dto,
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { portfolio: JSON.stringify(items) },
    });

    return { message: "Portfolio item added", item: newItem };
  }

  async updatePortfolioItem(userId: string, itemId: string, dto: any) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { portfolio: true },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    let items: any[] = [];
    try {
      items = profile.portfolio ? JSON.parse(profile.portfolio) : [];
    } catch {
      items = [];
    }
    const index = items.findIndex((i: any) => i.id === itemId);
    if (index === -1) throw new BadRequestException("Portfolio item not found");

    items[index] = {
      ...items[index],
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { portfolio: JSON.stringify(items) },
    });

    return { message: "Portfolio item updated", item: items[index] };
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { portfolio: true },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    let items: any[] = [];
    try {
      items = profile.portfolio ? JSON.parse(profile.portfolio) : [];
    } catch {
      items = [];
    }
    const filtered = items.filter((i: any) => i.id !== itemId);
    if (filtered.length === items.length)
      throw new BadRequestException("Portfolio item not found");

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { portfolio: JSON.stringify(filtered) },
    });

    return { message: "Portfolio item deleted" };
  }

  // ============ CV UPLOAD ============

  async updateCv(userId: string, cvUrl: string, cvFileName: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { cvUrl, cvFileName },
    });

    return { message: "CV uploaded successfully", cvUrl, cvFileName };
  }

  async getSellerTenant(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenants: { where: { deletedAt: null }, take: 1 } },
    });
    if (!user?.tenants?.[0]) throw new NotFoundException("No store found");
    return user.tenants[0];
  }

  // ============ STORE MENU ============

  async createStoreMenu(userId: string, dto: any) {
    const tenant = await this.getSellerTenant(userId);

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.prisma.storeMenu.findFirst({
        where: { id: dto.parentId, tenantId: tenant.id },
      });
      if (!parent) {
        throw new BadRequestException("Parent menu tidak ditemukan");
      }
    }

    // Validate page slug if type is "page"
    if (dto.type === "page" && dto.pageSlug) {
      const page = await this.prisma.storePage.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: dto.pageSlug,
          },
        },
      });
      if (!page) {
        throw new BadRequestException(`Halaman dengan slug "${dto.pageSlug}" tidak ditemukan`);
      }
    }

    const menu = await this.prisma.storeMenu.create({
      data: {
        tenantId: tenant.id,
        label: dto.label,
        type: dto.type,
        url: dto.url,
        pageSlug: dto.pageSlug,
        icon: dto.icon,
        isVisible: dto.isVisible ?? true,
        sortOrder: dto.sortOrder ?? 0,
        parentId: dto.parentId,
      },
    });

    return {
      message: `Menu "${menu.label}" berhasil dibuat`,
      menu,
    };
  }

  async getStoreMenus(userId: string) {
    const tenant = await this.getSellerTenant(userId);

    const menus = await this.prisma.storeMenu.findMany({
      where: { tenantId: tenant.id },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Return only top-level menus (no parent)
    const topLevelMenus = menus.filter((m: any) => !m.parentId);

    return { menus: topLevelMenus };
  }

  async getStoreMenu(userId: string, menuId: string) {
    const tenant = await this.getSellerTenant(userId);

    const menu = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
      include: {
        children: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!menu) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    return { menu };
  }

  async updateStoreMenu(userId: string, menuId: string, dto: any) {
    const tenant = await this.getSellerTenant(userId);

    const existing = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    // Validate parent if changing
    if (dto.parentId !== undefined) {
      if (dto.parentId === menuId) {
        throw new BadRequestException("Menu tidak bisa menjadi parent dari dirinya sendiri");
      }

      if (dto.parentId) {
        const parent = await this.prisma.storeMenu.findFirst({
          where: {
            id: dto.parentId,
            tenantId: tenant.id,
          },
        });

        if (!parent) {
          throw new BadRequestException("Parent menu tidak ditemukan");
        }
      }
    }

    // Validate page slug if type is "page"
    if (dto.type === "page" && dto.pageSlug) {
      const page = await this.prisma.storePage.findUnique({
        where: {
          tenantId_slug: {
            tenantId: tenant.id,
            slug: dto.pageSlug,
          },
        },
      });

      if (!page) {
        throw new BadRequestException(`Halaman dengan slug "${dto.pageSlug}" tidak ditemukan`);
      }
    }

    const menu = await this.prisma.storeMenu.update({
      where: { id: menuId },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.type && { type: dto.type }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.pageSlug !== undefined && { pageSlug: dto.pageSlug }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.isVisible !== undefined && { isVisible: dto.isVisible }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
    });

    return {
      message: `Menu "${menu.label}" berhasil diperbarui`,
      menu,
    };
  }

  async deleteStoreMenu(userId: string, menuId: string) {
    const tenant = await this.getSellerTenant(userId);

    const existing = await this.prisma.storeMenu.findFirst({
      where: {
        id: menuId,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      throw new NotFoundException("Menu tidak ditemukan");
    }

    // Delete menu and its children (cascade)
    await this.prisma.storeMenu.delete({
      where: { id: menuId },
    });

    return {
      message: `Menu "${existing.label}" berhasil dihapus`,
    };
  }
}
