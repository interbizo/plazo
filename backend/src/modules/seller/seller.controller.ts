import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  UseGuards,
  Param,
  ForbiddenException,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { SellerService } from "./seller.service";
import {
  UpdateSellerProfileDto,
  UpdateStoreSettingsDto,
  AddPortfolioItemDto,
  UpdatePortfolioItemDto,
  CreateStorePageDto,
  UpdateStorePageDto,
  CreateStoreMenuDto,
  UpdateStoreMenuDto,
} from "./seller.dto";
import { CmsService } from "@modules/cms/cms.service";
import { PrismaService } from "@modules/database/prisma.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { FeatureGuard } from "@common/guards/feature.guard";
import { RequireFeature } from "@common/decorators/require-feature.decorator";
import { SubscriptionFeature } from "@common/types/subscription-features.types";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/seller")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class SellerController {
  constructor(
    private sellerService: SellerService,
    private cmsService: CmsService,
    private prisma: PrismaService,
  ) {}

  // ============ DASHBOARD ============

  @Get("dashboard")
  getDashboard(@GetUser("id") userId: string) {
    return this.sellerService.getDashboard(userId);
  }

  /* DISABLED - fitur dihapus
  @Get("dashboard/system")
  getSystemDashboard(@GetUser("id") userId: string) {
    return this.sellerService.getAnalytics(userId);
  }
  */

  // ============ PROFILE ============

  @Get("profile")
  getProfile(@GetUser("id") userId: string) {
    return this.sellerService.getProfile(userId);
  }

  @Put("profile")
  updateProfile(
    @GetUser("id") userId: string,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    return this.sellerService.updateProfile(userId, dto);
  }

  // ============ STORE SETTINGS ============

  @Get("store")
  getStoreSettings(@GetUser("id") userId: string) {
    return this.sellerService.getStoreSettings(userId);
  }

  @Put("store")
  updateStoreSettings(
    @GetUser("id") userId: string,
    @Body() dto: UpdateStoreSettingsDto,
  ) {
    return this.sellerService.updateStoreSettings(userId, dto);
  }

  // ============ ANALYTICS ============

  /* DISABLED - fitur dihapus
  @Get("analytics")
  getAnalytics(
    @GetUser("id") userId: string,
    @Query("period") period?: string,
  ) {
    return this.sellerService.getAnalytics(userId, period);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("analytics/orders")
  getOrderAnalytics(@GetUser("id") userId: string) {
    return this.sellerService.getOrderAnalytics(userId);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("analytics/top-listings")
  @UseGuards(FeatureGuard)
  @RequireFeature("canAnalyticsAdvanced")
  getTopListings(@GetUser("id") userId: string) {
    return this.sellerService.getTopListings(userId);
  }
  */

  // ============ REVENUE & FINANCIAL ============

  /* DISABLED - fitur dihapus
  @Get("earnings")
  getEarnings(@GetUser("id") userId: string, @Query("period") period?: string) {
    return this.sellerService.getEarnings(userId, period);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("revenue")
  getRevenueBreakdown(
    @GetUser("id") userId: string,
    @Query("period") period?: string,
  ) {
    return this.sellerService.getRevenueBreakdown(userId, period);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("transactions")
  getTransactionHistory(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("type") type?: string,
  ) {
    return this.sellerService.getTransactionHistory(userId, page, limit, type);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("withdrawals")
  getWithdrawalHistory(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.sellerService.getWithdrawalHistory(userId, page, limit);
  }
  */

  /* DISABLED - fitur dihapus
  @Get("balance")
  getBalance(@GetUser("id") userId: string) {
    return this.sellerService.getBalance(userId);
  }
  */

  // ============ PRODUCTS & SERVICES ============

  @Get("products")
  getProducts(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
  ) {
    return this.sellerService.getSellerProducts(userId, page, limit, search);
  }

  @Get("products/:id")
  getProduct(@GetUser("id") userId: string, @Param("id") productId: string) {
    return this.sellerService.getSellerProduct(userId, productId);
  }

  @Get("services")
  getServices(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
  ) {
    return this.sellerService.getSellerServices(userId, page, limit, search);
  }

  @Get("services/:id")
  getService(@GetUser("id") userId: string, @Param("id") serviceId: string) {
    return this.sellerService.getSellerService(userId, serviceId);
  }

  // ============ ORDERS ============

  /* DISABLED - fitur dihapus
  @Get("orders")
  getOrders(
    @GetUser("id") userId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.sellerService.getSellerOrders(
      userId,
      page,
      limit,
      status,
      search,
    );
  }
  */

  // ============ REVIEWS ============

  @Get("reviews")
  getReceivedReviews(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.sellerService.getReceivedReviews(userId, page, limit);
  }

  @Get("reviews/stats")
  getReviewStats(@GetUser("id") userId: string) {
    return this.sellerService.getReviewStats(userId);
  }

  // ============ PROPOSALS ============

  @Get("proposals")
  getMyProposals(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.sellerService.getMyProposals(userId, page, limit, status);
  }

  @Get("proposals/stats")
  getProposalStats(@GetUser("id") userId: string) {
    return this.sellerService.getProposalStats(userId);
  }

  // ============ CUSTOM OFFERS ============

  /* DISABLED - fitur dihapus
  @Get("custom-offers")
  getMyCustomOffers(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.sellerService.getMyCustomOffers(userId, page, limit);
  }
  */

  // ============ DISPUTES ============

  /* DISABLED - fitur dihapus
  @Get("disputes")
  getSellerDisputes(
    @GetUser("id") userId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.sellerService.getSellerDisputes(userId, page, limit);
  }
  */

  // ============ VERIFICATION & LEVEL ============

  @Get("verification")
  getVerificationStatus(@GetUser("id") userId: string) {
    return this.sellerService.getVerificationStatus(userId);
  }

  // ============ NOTIFICATIONS ============

  @Get("notifications/count")
  getNotificationCount(@GetUser("id") userId: string) {
    return this.sellerService.getNotificationCount(userId);
  }

  // ============ PORTFOLIO ============

  @Get("portfolio")
  getPortfolio(@GetUser("id") userId: string) {
    return this.sellerService.getPortfolio(userId);
  }

  @Post("portfolio")
  addPortfolioItem(
    @GetUser("id") userId: string,
    @Body() dto: AddPortfolioItemDto,
  ) {
    return this.sellerService.addPortfolioItem(userId, dto);
  }

  @Put("portfolio/:itemId")
  updatePortfolioItem(
    @GetUser("id") userId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdatePortfolioItemDto,
  ) {
    return this.sellerService.updatePortfolioItem(userId, itemId, dto);
  }

  @Delete("portfolio/:itemId")
  deletePortfolioItem(
    @GetUser("id") userId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.sellerService.deletePortfolioItem(userId, itemId);
  }

  // ============ CV UPLOAD ============

  @Put("cv")
  uploadCv(
    @GetUser("id") userId: string,
    @Body() body: { cvUrl: string; cvFileName: string },
  ) {
    return this.sellerService.updateCv(userId, body.cvUrl, body.cvFileName);
  }

  // ============ FLASH SALE / PROMOTIONS ============

  // ============ STORE PAGES CMS ============

  @Get("store/pages")
  getStorePages(@GetUser("id") userId: string) {
    return this.sellerService.getStorePages(userId);
  }

  @Get("store/pages/:pageId")
  getStorePage(@GetUser("id") userId: string, @Param("pageId") pageId: string) {
    return this.sellerService.getStorePage(userId, pageId);
  }

  @Post("store/pages")
  createStorePage(
    @GetUser("id") userId: string,
    @Body() dto: CreateStorePageDto,
  ) {
    return this.sellerService.createStorePage(userId, dto);
  }

  @Put("store/pages/:pageId")
  updateStorePage(
    @GetUser("id") userId: string,
    @Param("pageId") pageId: string,
    @Body() dto: UpdateStorePageDto,
  ) {
    return this.sellerService.updateStorePage(userId, pageId, dto);
  }

  @Delete("store/pages/:pageId")
  deleteStorePage(
    @GetUser("id") userId: string,
    @Param("pageId") pageId: string,
  ) {
    return this.sellerService.deleteStorePage(userId, pageId);
  }

  // ============ FLASH SALE ============

  @Get("flash-sale")
  async getMyFlashSaleItems(@GetUser("id") userId: string) {
    const tenant = await this.sellerService.getSellerTenant(userId);
    return this.cmsService.getSellerFlashSaleItems(tenant.id);
  }

  @Post("flash-sale")
  @UseGuards(FeatureGuard)
  @RequireFeature(SubscriptionFeature.FLASH_SALE)
  async submitFlashSaleItem(
    @GetUser("id") userId: string,
    @Body()
    body: {
      productId?: string;
      serviceId?: string;
      salePrice: number;
      originalPrice: number;
      startDate?: string;
      endDate?: string;
      position?: string;
    },
  ) {
    const tenant = await this.sellerService.getSellerTenant(userId);

    // BUG-55: Validate that the product/service belongs to the seller's tenant
    if (!body.productId && !body.serviceId) {
      throw new BadRequestException(
        "Either productId or serviceId must be provided",
      );
    }

    if (body.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: body.productId, tenantId: tenant.id, deletedAt: null },
      });
      if (!product) {
        throw new ForbiddenException(
          "Product not found or does not belong to your store",
        );
      }
    }

    if (body.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: body.serviceId, tenantId: tenant.id, deletedAt: null },
      });
      if (!service) {
        throw new ForbiddenException(
          "Service not found or does not belong to your store",
        );
      }
    }

    return this.cmsService.createFlashSaleItem({
      ...body,
      tenantId: tenant.id,
    });
  }

  // ============ BOOSTS ============

  @Get("boosts")
  async getBoosts(
    @GetUser("id") userId: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("status") status?: "active" | "expired",
  ) {
    const tenant = await this.sellerService.getSellerTenant(userId);

    const now = new Date();
    const where: any = {
      tenantId: tenant.id,
      isBoosted: true,
    };

    if (status === "active") {
      where.boostedUntil = { gte: now };
    } else if (status === "expired") {
      where.boostedUntil = { lt: now };
    }

    const [products, services, jobs, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { ...where, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          price: true,
          isBoosted: true,
          boostedUntil: true,
          createdAt: true,
        },
        orderBy: { boostedUntil: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.service.findMany({
        where: { ...where, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          thumbnail: true,
          basePrice: true,
          isBoosted: true,
          boostedUntil: true,
          createdAt: true,
        },
        orderBy: { boostedUntil: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.job.findMany({
        where: { ...where, deletedAt: null },
        select: {
          id: true,
          title: true,
          slug: true,
          budget: true,
          isBoosted: true,
          boostedUntil: true,
          createdAt: true,
        },
        orderBy: { boostedUntil: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      Promise.all([
        this.prisma.product.count({ where: { ...where, deletedAt: null } }),
        this.prisma.service.count({ where: { ...where, deletedAt: null } }),
        this.prisma.job.count({ where: { ...where, deletedAt: null } }),
      ]).then(([p, s, j]) => p + s + j),
    ]);

    // Combine and format results
    const items = [
      ...products.map((p) => ({
        ...p,
        type: "product" as const,
        price: p.price,
      })),
      ...services.map((s) => ({
        ...s,
        type: "service" as const,
        name: s.name,
        price: s.basePrice,
      })),
      ...jobs.map((j) => ({
        ...j,
        type: "job" as const,
        name: j.title,
        price: j.budget,
      })),
    ].sort((a, b) => {
      const dateA = a.boostedUntil ? new Date(a.boostedUntil).getTime() : 0;
      const dateB = b.boostedUntil ? new Date(b.boostedUntil).getTime() : 0;
      return dateB - dateA;
    });

    return {
      data: items.slice(0, limit),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // ============ STORE MENU ============

  @Post("store/menus")
  createStoreMenu(
    @GetUser("id") userId: string,
    @Body() dto: CreateStoreMenuDto,
  ) {
    return this.sellerService.createStoreMenu(userId, dto);
  }

  @Get("store/menus")
  getStoreMenus(@GetUser("id") userId: string) {
    return this.sellerService.getStoreMenus(userId);
  }

  @Get("store/menus/:id")
  getStoreMenu(@GetUser("id") userId: string, @Param("id") menuId: string) {
    return this.sellerService.getStoreMenu(userId, menuId);
  }

  @Put("store/menus/:id")
  updateStoreMenu(
    @GetUser("id") userId: string,
    @Param("id") menuId: string,
    @Body() dto: UpdateStoreMenuDto,
  ) {
    return this.sellerService.updateStoreMenu(userId, menuId, dto);
  }

  @Delete("store/menus/:id")
  deleteStoreMenu(@GetUser("id") userId: string, @Param("id") menuId: string) {
    return this.sellerService.deleteStoreMenu(userId, menuId);
  }
}
