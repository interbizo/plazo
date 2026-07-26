import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  OnModuleInit,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";
import { EmailService } from "@modules/email/email.service";
import { cleanUpdateData } from "@common/utils/prisma.helper";
import {
  SubscriptionPlan,
  SellerTier,
  AffiliateType,
  AffiliateBonusStatus,
  AffiliateClaimStatus,
} from "@prisma/client";

/**
 * Fallback config — used ONLY if DB has no plan configs yet (first boot).
 * After seeding, all config is read from SubscriptionPlanConfig table.
 */
const DEFAULT_PLANS = [
  {
    plan: "FREE" as SubscriptionPlan,
    name: "Gratis",
    description: "Mulai jualan gratis dengan fitur dasar",
    monthlyPrice: 0,
    postsLimit: 10,
    sortOrder: 0,
    features: ["10 Produk/Jasa", "Toko Online", "Chat dengan Pembeli", "Analytics Dasar"],
  },
  {
    plan: "BASIC" as SubscriptionPlan,
    name: "Basic",
    description: "Untuk seller yang mulai berkembang",
    badge: "Populer",
    monthlyPrice: 49000,
    postsLimit: 50,
    sortOrder: 1,
    canPublishToMarketplace: true,
    canVerifiedBadge: true,
    canBulkUpload: true,
    canExportData: true,
    canFlashSale: true,
    features: ["50 Produk/Jasa", "Publish ke Marketplace", "Verified Badge", "Bulk Upload", "Export Data CSV", "Flash Sale"],
  },
  {
    plan: "PREMIUM" as SubscriptionPlan,
    name: "Premium",
    description: "Paket premium dengan fitur unggulan",
    badge: "Best Value",
    monthlyPrice: 99000,
    postsLimit: 100,
    sortOrder: 2,
    canPublishToMarketplace: true,
    canVerifiedBadge: true,
    canFeaturedStore: true,
    canHighlightProducts: true,
    canAdvancedAnalytics: true,
    canBulkUpload: true,
    canExportData: true,
    canFlashSale: true,
    canCustomTheme: true,
    features: ["100 Produk/Jasa", "Semua fitur Basic", "Featured Store", "Highlight Products", "Advanced Analytics", "Custom Theme Toko"],
  },
  {
    plan: "PROFESSIONAL" as SubscriptionPlan,
    name: "Professional",
    description: "Untuk seller profesional dengan fitur lengkap",
    monthlyPrice: 149000,
    postsLimit: 200,
    sortOrder: 3,
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
    features: ["200 Produk/Jasa", "Semua fitur Premium", "Priority Listing", "Muncul Lebih Atas di Pencarian"],
  },
  {
    plan: "ENTERPRISE" as SubscriptionPlan,
    name: "Enterprise",
    description: "Unlimited posting dengan semua fitur",
    monthlyPrice: 499000,
    postsLimit: 999999,
    sortOrder: 4,
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
    features: ["Unlimited Produk/Jasa", "Semua fitur Professional", "Hapus Branding Plazo"],
  },
  {
    plan: "ULTIMATE" as SubscriptionPlan,
    name: "Ultimate",
    description: "Paket tertinggi dengan prioritas support",
    monthlyPrice: 999000,
    postsLimit: 999999,
    sortOrder: 5,
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
    features: ["Semua fitur Enterprise", "Priority Support", "Dedicated Account Manager"],
  },
];

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private notificationEvents: NotificationEventsService,
    private emailService: EmailService,
  ) {}

  /**
   * Auto-seed plan configs on first boot if DB is empty
   */
  async onModuleInit() {
    const count = await this.prisma.subscriptionPlanConfig.count();
    if (count === 0) {
      this.logger.log("Seeding subscription plan configs...");
      for (const plan of DEFAULT_PLANS) {
        await this.prisma.subscriptionPlanConfig.create({
          data: {
            plan: plan.plan,
            name: plan.name,
            description: plan.description,
            badge: (plan as any).badge || null,
            monthlyPrice: plan.monthlyPrice,
            postsLimit: plan.postsLimit,
            sortOrder: plan.sortOrder,
            canPublishToMarketplace: (plan as any).canPublishToMarketplace ?? false,
            canVerifiedBadge: (plan as any).canVerifiedBadge ?? false,
            canFeaturedStore: (plan as any).canFeaturedStore ?? false,
            canHighlightProducts: (plan as any).canHighlightProducts ?? false,
            canPriorityListing: (plan as any).canPriorityListing ?? false,

            canAdvancedAnalytics: (plan as any).canAdvancedAnalytics ?? false,
            canBulkUpload: (plan as any).canBulkUpload ?? false,
            canExportData: (plan as any).canExportData ?? false,
            canFlashSale: (plan as any).canFlashSale ?? false,
            canCustomTheme: (plan as any).canCustomTheme ?? false,
            canRemoveBranding: (plan as any).canRemoveBranding ?? false,
            features: plan.features,
          },
        });
      }
      this.logger.log(`Seeded ${DEFAULT_PLANS.length} subscription plans`);
    }
  }

  /**
   * Get plan config from DB (cached per request)
   */
  private async getPlanConfig(plan: SubscriptionPlan) {
    const config = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan },
    });
    if (!config) throw new NotFoundException(`Plan config for ${plan} not found`);
    return config;
  }

  private normalizeCity(city?: string | null) {
    return city?.trim().toLowerCase() || null;
  }

  private generateReferralCode(firstName?: string | null, userId?: string) {
    const base = (firstName || "seller")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6);
    const suffix = (userId || Math.random().toString(36).slice(2))
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-6);
    return `${base || "SELLER"}-${suffix}`;
  }

  private async ensureAffiliateProfile(userId: string) {
    const existing = await this.prisma.affiliateProfile.findUnique({
      where: { userId },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true },
    });

    let referralCode = this.generateReferralCode(user?.firstName, userId);
    let attempt = 0;
    while (attempt < 5) {
      const conflict = await this.prisma.affiliateProfile.findUnique({
        where: { referralCode },
      });
      if (!conflict) break;
      referralCode = this.generateReferralCode(user?.firstName, `${userId}${attempt}`);
      attempt++;
    }

    return this.prisma.affiliateProfile.create({
      data: {
        userId,
        referralCode,
      },
    });
  }

  private async getSellerTenantOrThrow(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("Toko tidak ditemukan");
    return tenant;
  }

  private ensureAffiliateEligible(plan?: SubscriptionPlan | null) {
    if (!plan || plan === "FREE") {
      throw new ForbiddenException(
        "Program affiliate hanya tersedia untuk seller yang sudah berlangganan.",
      );
    }
  }

  private isMissingAffiliateTableError(error: unknown) {
    if (typeof error !== "object" || error === null || !("code" in error)) {
      return false;
    }

    const code = (error as { code?: string }).code;
    return code === "P2021" || code === "P2022";
  }

  private async getAffiliateProfileSafely(userId: string, ensure: boolean) {
    try {
      return ensure
        ? await this.ensureAffiliateProfile(userId)
        : await this.prisma.affiliateProfile.findUnique({ where: { userId } });
    } catch (error) {
      if (this.isMissingAffiliateTableError(error)) {
        this.logger.warn(
          "Affiliate table is not available; subscription data will be returned without affiliate info.",
        );
        return null;
      }
      throw error;
    }
  }

  private async resolveAffiliateForPayment(params: {
    sellerUserId: string;
    tenantId: string;
    tenantCity?: string | null;
    referralCode?: string | null;
  }) {
    const normalizedCity = this.normalizeCity(params.tenantCity);

    if (normalizedCity) {
      const cityAffiliate = await this.prisma.affiliateProfile.findFirst({
        where: {
          isActive: true,
          isCitySpecial: true,
          city: { equals: normalizedCity, mode: "insensitive" },
          userId: { not: params.sellerUserId },
        },
      });

      if (cityAffiliate) {
        return {
          affiliateUserId: cityAffiliate.userId,
          affiliateType: AffiliateType.CITY_SPECIAL,
          affiliateRate: 0.3,
          referralCodeUsed: cityAffiliate.referralCode,
          citySnapshot: cityAffiliate.city || params.tenantCity || null,
        };
      }
    }

    const referralCode = params.referralCode?.trim().toUpperCase();
    if (!referralCode) return null;

    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { referralCode },
    });

    if (!profile || !profile.isActive) {
      throw new BadRequestException("Kode referral tidak valid atau tidak aktif.");
    }

    if (profile.userId === params.sellerUserId) {
      throw new BadRequestException("Anda tidak dapat menggunakan kode referral sendiri.");
    }

    return {
      affiliateUserId: profile.userId,
      affiliateType: profile.isCitySpecial
        ? AffiliateType.CITY_SPECIAL
        : AffiliateType.GENERAL,
      affiliateRate: profile.isCitySpecial ? 0.3 : 0.2,
      referralCodeUsed: profile.referralCode,
      citySnapshot: profile.city || params.tenantCity || null,
    };
  }

  // ============================================
  // PUBLIC: Get Plans
  // ============================================

  async getPlans() {
    return this.prisma.subscriptionPlanConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  }

  // ============================================
  // SELLER: Current Subscription
  // ============================================

  async getCurrentSubscription(userId: string) {
    try {
      console.log(`[getCurrentSubscription] Fetching for userId: ${userId}`);
      
      const tenant = await this.prisma.tenant.findFirst({
        where: { ownerId: userId, deletedAt: null },
        include: { subscription: true },
      });
      
      if (!tenant) {
        console.log(`[getCurrentSubscription] Tenant not found for userId: ${userId}`);
        throw new BadRequestException("Tenant tidak ditemukan");
      }

      console.log(`[getCurrentSubscription] Found tenant: ${tenant.id}, plan: ${tenant.subscriptionPlan}`);

      const affiliateProfile = await this.getAffiliateProfileSafely(
        userId,
        tenant.subscriptionPlan !== "FREE",
      );

      const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
        where: { plan: tenant.subscriptionPlan },
      });

      if (!planConfig) {
        console.warn(`[getCurrentSubscription] Plan config not found for plan: ${tenant.subscriptionPlan}`);
      }

      const allPlans = await this.getPlans();

      // Get features from plan config
      const features: any = {
        canHighlightProducts: tenant.canHighlightProducts,
        canPriorityListing: tenant.canPriorityListing,
        canAnalyticsAdvanced: tenant.canAnalyticsAdvanced,
        isVerified: tenant.isVerified,
        isFeatured: tenant.isFeatured,
      };

      // Add features from plan config if available
      if (planConfig) {
        features.canPublishToMarketplace = planConfig.canPublishToMarketplace || false;
        features.canVerifiedBadge = planConfig.canVerifiedBadge || false;
        features.canFeaturedStore = planConfig.canFeaturedStore || false;
        features.canBoostListing = planConfig.canBoostListing || false;
        features.canFlashSale = planConfig.canFlashSale || false;
        features.canBulkUpload = planConfig.canBulkUpload || false;
        features.canExportData = planConfig.canExportData || false;
        features.canCustomTheme = planConfig.canCustomTheme || false;
        features.canRemoveBranding = planConfig.canRemoveBranding || false;
        features.canRequestPhysicalVerification = planConfig.canRequestPhysicalVerification || false;
        features.canSubmitProposal = planConfig.canSubmitProposal || false;
        features.canWhatsappCheckout = planConfig.canWhatsappCheckout || false;
        features.canToolsRecommendation = planConfig.canToolsRecommendation || false;
        features.canBecomeAffiliate = planConfig.canBecomeAffiliate || false;
      } else {
        // Default to false if no plan config
        features.canPublishToMarketplace = false;
        features.canVerifiedBadge = false;
        features.canFeaturedStore = false;
        features.canBoostListing = false;
        features.canFlashSale = false;
        features.canBulkUpload = false;
        features.canExportData = false;
        features.canCustomTheme = false;
        features.canRemoveBranding = false;
        features.canRequestPhysicalVerification = false;
        features.canSubmitProposal = false;
        features.canWhatsappCheckout = false;
        features.canToolsRecommendation = false;
        features.canBecomeAffiliate = false;
      }

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
          subscriptionPlan: tenant.subscriptionPlan,
          sellerTier: tenant.sellerTier,
          postsLimit: tenant.postsLimit,
          usedPosts: tenant.usedPosts,
          postsRemaining: Math.max(0, tenant.postsLimit - tenant.usedPosts),
          subscriptionExpiresAt: tenant.subscriptionExpiresAt,
        },
        features, // ✅ Return all features including canBoostListing
        subscription: tenant.subscription,
        planConfig,
        allPlans,
        affiliate: affiliateProfile
          ? {
              referralCode: affiliateProfile.referralCode,
              isActive: affiliateProfile.isActive,
              isCitySpecial: affiliateProfile.isCitySpecial,
              city: affiliateProfile.city,
            }
          : null,
      };
    } catch (error) {
      console.error('[getCurrentSubscription] Error:', error);
      throw error;
    }
  }

  // ============================================
  // SELLER: Change Plan
  // ============================================

  async changePlan(userId: string, newPlan: SubscriptionPlan) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
    });
    if (!tenant) throw new BadRequestException("Tenant tidak ditemukan");

    const currentPlan = tenant.subscriptionPlan;
    if (currentPlan === newPlan) {
      throw new BadRequestException("Anda sudah menggunakan paket ini");
    }

    const newConfig = await this.getPlanConfig(newPlan);
    const oldConfig = await this.getPlanConfig(currentPlan);
    const isUpgrade = newConfig.monthlyPrice > oldConfig.monthlyPrice;
    const isDowngrade = newConfig.monthlyPrice < oldConfig.monthlyPrice;

    // Paid plans require payment — only allow direct change to FREE (downgrade)
    if (newPlan !== "FREE" && newConfig.monthlyPrice > 0) {
      throw new BadRequestException(
        "Untuk upgrade ke paket berbayar, silakan lakukan pembayaran terlebih dahulu melalui halaman subscription.",
      );
    }

    if (isDowngrade && tenant.usedPosts > newConfig.postsLimit) {
      throw new BadRequestException(
        `Anda memiliki ${tenant.usedPosts} posting aktif. Paket ${newConfig.name} hanya mengizinkan ${newConfig.postsLimit}. Hapus beberapa posting terlebih dahulu.`,
      );
    }

    const now = new Date();
    const renewalDate =
      newPlan === "FREE"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const newTier: SellerTier = newPlan === "FREE" ? "FREE" : "MEMBER";

    const [updatedTenant] = await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          subscriptionPlan: newPlan,
          sellerTier: newTier,
          postsLimit: newConfig.postsLimit,
          subscriptionExpiresAt: renewalDate,
          isVerified: newConfig.canVerifiedBadge,
          isFeatured: newConfig.canFeaturedStore,
          canHighlightProducts: newConfig.canHighlightProducts,
          canPriorityListing: newConfig.canPriorityListing,
          canAnalyticsAdvanced: newConfig.canAdvancedAnalytics,
        },
      }),
      this.prisma.subscription.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          plan: newPlan,
          monthlyPrice: newConfig.monthlyPrice,
          isActive: newPlan !== "FREE",
          startDate: now,
          renewalDate,
          previousPlan: currentPlan,
          upgradedAt: isUpgrade ? now : undefined,
          downgradedAt: isDowngrade ? now : undefined,
        },
        update: {
          plan: newPlan,
          monthlyPrice: newConfig.monthlyPrice,
          isActive: newPlan !== "FREE",
          renewalDate,
          cancelledAt: null,
          autoRenew: newPlan !== "FREE",
          previousPlan: currentPlan,
          upgradedAt: isUpgrade ? now : undefined,
          downgradedAt: isDowngrade ? now : undefined,
          lastPaymentAt: newConfig.monthlyPrice > 0 ? now : undefined,
          lastPaymentAmount:
            newConfig.monthlyPrice > 0 ? newConfig.monthlyPrice : undefined,
        },
      }),
      this.prisma.subscriptionHistory.create({
        data: {
          tenantId: tenant.id,
          fromPlan: currentPlan,
          toPlan: newPlan,
          fromTier: tenant.sellerTier,
          toTier: newTier,
          amount: newConfig.monthlyPrice,
          reason: isUpgrade ? "upgrade" : isDowngrade ? "downgrade" : "change",
          changedBy: userId,
        },
      }),
    ]);

    return {
      message: isUpgrade
        ? `Berhasil upgrade ke ${newConfig.name}`
        : isDowngrade
          ? `Berhasil downgrade ke ${newConfig.name}`
          : `Berhasil pindah ke ${newConfig.name}`,
      tenant: updatedTenant,
    };
  }

  async cancelSubscription(userId: string) {
    return this.changePlan(userId, SubscriptionPlan.FREE);
  }

  async updateAutoRenew(userId: string, autoRenew: boolean) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId },
      include: { subscription: true },
    });
    if (!tenant) throw new BadRequestException("Tenant tidak ditemukan");
    if (!tenant.subscription)
      throw new BadRequestException("Tidak ada subscription aktif");
    if (tenant.subscriptionPlan === "FREE")
      throw new BadRequestException("Paket FREE tidak memerlukan auto-renew");

    await this.prisma.subscription.update({
      where: { tenantId: tenant.id },
      data: { autoRenew },
    });

    return {
      message: autoRenew
        ? "Auto-renew diaktifkan"
        : "Auto-renew dinonaktifkan",
    };
  }

  // ============================================
  // CRON: Check Expired Subscriptions
  // ============================================

  async checkExpiredSubscriptions() {
    const expiredTenants = await this.prisma.tenant.findMany({
      where: {
        subscriptionPlan: { not: "FREE" },
        subscriptionExpiresAt: { lt: new Date() },
        subscription: { autoRenew: false },
      },
      include: { subscription: true },
    });

    const freeConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: "FREE" },
    });
    const freePostsLimit = freeConfig?.postsLimit ?? 10;

    for (const tenant of expiredTenants) {
      await this.prisma.$transaction([
        this.prisma.tenant.update({
          where: { id: tenant.id },
          data: {
            subscriptionPlan: "FREE",
            sellerTier: "FREE",
            postsLimit: freePostsLimit,
            subscriptionExpiresAt: null,
            isVerified: false,
            isFeatured: false,
            canHighlightProducts: false,
            canPriorityListing: false,

            canAnalyticsAdvanced: false,
          },
        }),
        this.prisma.subscription.update({
          where: { tenantId: tenant.id },
          data: { isActive: false, plan: "FREE" },
        }),
        this.prisma.subscriptionHistory.create({
          data: {
            tenantId: tenant.id,
            fromPlan: tenant.subscriptionPlan,
            toPlan: "FREE",
            fromTier: tenant.sellerTier,
            toTier: "FREE",
            amount: 0,
            reason: "expiry",
            changedBy: "system",
          },
        }),
      ]);
    }

    return { expired: expiredTenants.length };
  }

  async getSubscriptionHistory(userId: string) {
    try {
      console.log(`[getSubscriptionHistory] Fetching for userId: ${userId}`);
      
      const tenant = await this.prisma.tenant.findFirst({
        where: { ownerId: userId, deletedAt: null },
      });
      
      if (!tenant) {
        console.log(`[getSubscriptionHistory] Tenant not found for userId: ${userId}`);
        throw new BadRequestException("Tenant tidak ditemukan");
      }

      const history = await this.prisma.subscriptionHistory.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      console.log(`[getSubscriptionHistory] Found ${history.length} history records`);
      return history;
    } catch (error) {
      console.error('[getSubscriptionHistory] Error:', error);
      throw error;
    }
  }

  // ============================================
  // ADMIN: Change Tenant Plan
  // ============================================

  async adminChangePlan(
    tenantId: string,
    newPlan: SubscriptionPlan,
    adminUserId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new BadRequestException("Tenant tidak ditemukan");

    const newConfig = await this.getPlanConfig(newPlan);
    const oldConfig = await this.getPlanConfig(tenant.subscriptionPlan);
    const isUpgrade = newConfig.monthlyPrice > oldConfig.monthlyPrice;
    const isDowngrade = newConfig.monthlyPrice < oldConfig.monthlyPrice;
    const now = new Date();
    const renewalDate =
      newPlan === "FREE"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const newTier: SellerTier = newPlan === "FREE" ? "FREE" : "MEMBER";

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          subscriptionPlan: newPlan,
          sellerTier: newTier,
          postsLimit: newConfig.postsLimit,
          subscriptionExpiresAt: renewalDate,
          isVerified: newConfig.canVerifiedBadge,
          isFeatured: newConfig.canFeaturedStore,
          canHighlightProducts: newConfig.canHighlightProducts,
          canPriorityListing: newConfig.canPriorityListing,
          canAnalyticsAdvanced: newConfig.canAdvancedAnalytics,
        },
      }),
      this.prisma.subscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          plan: newPlan,
          monthlyPrice: newConfig.monthlyPrice,
          isActive: newPlan !== "FREE",
          startDate: now,
          renewalDate,
          previousPlan: tenant.subscriptionPlan,
          upgradedAt: isUpgrade ? now : undefined,
          downgradedAt: isDowngrade ? now : undefined,
        },
        update: {
          plan: newPlan,
          monthlyPrice: newConfig.monthlyPrice,
          isActive: newPlan !== "FREE",
          renewalDate,
          previousPlan: tenant.subscriptionPlan,
          upgradedAt: isUpgrade ? now : undefined,
          downgradedAt: isDowngrade ? now : undefined,
        },
      }),
      this.prisma.subscriptionHistory.create({
        data: {
          tenantId,
          fromPlan: tenant.subscriptionPlan,
          toPlan: newPlan,
          fromTier: tenant.sellerTier,
          toTier: newTier,
          amount: 0,
          reason: isUpgrade ? "admin_upgrade" : isDowngrade ? "admin_downgrade" : "admin_change",
          changedBy: adminUserId,
        },
      }),
    ]);

    return { message: `Paket tenant berhasil diubah ke ${newConfig.name}` };
  }

  // ============================================
  // SUPER ADMIN: CRUD Plan Configs
  // ============================================

  async getAllPlanConfigs() {
    return this.prisma.subscriptionPlanConfig.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async getPlanConfigById(id: string) {
    const config = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException("Plan config not found");
    return config;
  }

  async updatePlanConfig(
    id: string,
    data: {
      name?: string;
      description?: string;
      badge?: string;
      monthlyPrice?: number;
      yearlyPrice?: number;
      currency?: string;
      postsLimit?: number;
      maxImagesPerPost?: number;
      maxFileSize?: number;
      sortOrder?: number;
      isActive?: boolean;

      canPublishToMarketplace?: boolean;
      canVerifiedBadge?: boolean;
      canFeaturedStore?: boolean;
      canHighlightProducts?: boolean;
      canPriorityListing?: boolean;

      canAdvancedAnalytics?: boolean;
      canBulkUpload?: boolean;
      canExportData?: boolean;
      canFlashSale?: boolean;
      canCustomTheme?: boolean;
      canRemoveBranding?: boolean;
      canRequestPhysicalVerification?: boolean;
      features?: string[];
    },
  ) {
    const existing = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Plan config not found");

    // Clean data - remove readonly fields
    const cleanData = cleanUpdateData(data);

    const updated = await this.prisma.subscriptionPlanConfig.update({
      where: { id },
      data: {
        ...cleanData,
        features: cleanData.features ? cleanData.features : undefined,
      },
    });

    return { message: `Paket ${updated.name} berhasil diperbarui`, config: updated };
  }

  /**
   * Get platform payment accounts (for subscription payment page — seller-facing, active only)
   */
  async getPlatformPaymentAccounts() {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: {
        tenantId: null, // Platform accounts (not seller accounts)
        isActive: true,
      },
      orderBy: { isPrimary: "desc" },
    });

    return { data: accounts };
  }

  /**
   * Get ALL platform payment accounts (admin — includes inactive)
   */
  async getAdminPlatformPaymentAccounts() {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { tenantId: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });

    return { data: accounts };
  }

  /**
   * Create a platform payment account (admin)
   */
  async createPlatformPaymentAccount(data: {
    type: string;
    bankName?: string;
    accountNumber: string;
    accountName: string;
    walletType?: string;
    phoneNumber?: string;
    isActive?: boolean;
    isPrimary?: boolean;
  }) {
    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: { tenantId: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.paymentAccount.create({
      data: {
        tenantId: null,
        type: data.type as any,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        walletType: data.walletType,
        phoneNumber: data.phoneNumber,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
      },
    });

    return { message: "Rekening berhasil ditambahkan", data: account };
  }

  /**
   * Update a platform payment account (admin)
   */
  async updatePlatformPaymentAccount(
    id: string,
    data: {
      type?: string;
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      walletType?: string;
      phoneNumber?: string;
      description?: string;
      isActive?: boolean;
      isPrimary?: boolean;
    },
  ) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Rekening tidak ditemukan");
    if (existing.tenantId !== null)
      throw new BadRequestException("Bukan rekening platform");

    // If setting as primary, unset other primaries
    if (data.isPrimary && !existing.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: { tenantId: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Clean data - remove readonly fields
    const cleanData = cleanUpdateData(data);

    const account = await this.prisma.paymentAccount.update({
      where: { id },
      data: {
        type: cleanData.type as any ?? undefined,
        bankName: cleanData.bankName,
        accountNumber: cleanData.accountNumber,
        accountName: cleanData.accountName,
        walletType: cleanData.walletType,
        phoneNumber: cleanData.phoneNumber,
        isActive: cleanData.isActive,
        isPrimary: cleanData.isPrimary,
      },
    });

    return { message: "Rekening berhasil diperbarui", data: account };
  }

  /**
   * Delete a platform payment account (admin)
   */
  async deletePlatformPaymentAccount(id: string) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Rekening tidak ditemukan");
    if (existing.tenantId !== null)
      throw new BadRequestException("Bukan rekening platform");

    await this.prisma.paymentAccount.delete({ where: { id } });

    return { message: "Rekening berhasil dihapus" };
  }

  /**
   * Create a new plan config (Super Admin)
   */
  async createPlanConfig(data: {
    plan: string;
    name: string;
    description?: string;
    badge?: string;
    monthlyPrice: number;
    yearlyPrice?: number;
    postsLimit: number;
    maxImagesPerPost?: number;
    maxFileSize?: number;
    sortOrder?: number;
    isActive?: boolean;
    canPublishToMarketplace?: boolean;
    canVerifiedBadge?: boolean;
    canFeaturedStore?: boolean;
    canHighlightProducts?: boolean;
    canPriorityListing?: boolean;
    canAdvancedAnalytics?: boolean;
    canBulkUpload?: boolean;
    canExportData?: boolean;
    canFlashSale?: boolean;
    canCustomTheme?: boolean;
    canRemoveBranding?: boolean;
    canRequestPhysicalVerification?: boolean;
    features?: string[];
  }) {
    // Check if plan already exists
    const existing = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: data.plan as any },
    });
    if (existing) {
      throw new BadRequestException(`Paket dengan plan "${data.plan}" sudah ada`);
    }

    const config = await this.prisma.subscriptionPlanConfig.create({
      data: {
        plan: data.plan as any,
        name: data.name,
        description: data.description,
        badge: data.badge,
        monthlyPrice: data.monthlyPrice,
        yearlyPrice: data.yearlyPrice,
        postsLimit: data.postsLimit,
        maxImagesPerPost: data.maxImagesPerPost ?? 5,
        maxFileSize: data.maxFileSize ?? 10,
        sortOrder: data.sortOrder ?? 99,
        isActive: data.isActive ?? true,
        canPublishToMarketplace: data.canPublishToMarketplace ?? false,
        canVerifiedBadge: data.canVerifiedBadge ?? false,
        canFeaturedStore: data.canFeaturedStore ?? false,
        canHighlightProducts: data.canHighlightProducts ?? false,
        canPriorityListing: data.canPriorityListing ?? false,
        canAdvancedAnalytics: data.canAdvancedAnalytics ?? false,
        canBulkUpload: data.canBulkUpload ?? false,
        canExportData: data.canExportData ?? false,
        canFlashSale: data.canFlashSale ?? false,
        canCustomTheme: data.canCustomTheme ?? false,
        canRemoveBranding: data.canRemoveBranding ?? false,
        canRequestPhysicalVerification: data.canRequestPhysicalVerification ?? false,
        features: data.features ?? [],
      },
    });

    return { message: `Paket "${config.name}" berhasil dibuat`, config };
  }

  /**
   * Delete a plan config (Super Admin)
   * Cannot delete if there are active tenants using this plan.
   */
  async deletePlanConfig(id: string) {
    const config = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });
    if (!config) throw new NotFoundException("Plan config not found");

    // Cannot delete FREE plan
    if (config.plan === "FREE") {
      throw new BadRequestException("Paket FREE tidak bisa dihapus");
    }

    // Check if any tenant is using this plan
    const tenantsUsingPlan = await this.prisma.tenant.count({
      where: { subscriptionPlan: config.plan, deletedAt: null },
    });

    if (tenantsUsingPlan > 0) {
      throw new BadRequestException(
        `Tidak bisa menghapus paket "${config.name}" karena masih digunakan oleh ${tenantsUsingPlan} toko. Pindahkan mereka ke paket lain terlebih dahulu.`,
      );
    }

    await this.prisma.subscriptionPlanConfig.delete({ where: { id } });

    return { message: `Paket "${config.name}" berhasil dihapus` };
  }

  // ============ SUBSCRIPTION PAYMENT (Manual Transfer) ============

  async createSubscriptionPayment(
    userId: string,
    dto: {
      plan: SubscriptionPlan;
      amount: number;
      durationDays?: number;
      proofImageUrl: string;
      accountName?: string;
      accountNumber?: string;
      transferDate?: string;
      notes?: string;
      referralCode?: string;
    },
  ) {
    // Get seller's tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });
    if (!tenant) throw new NotFoundException("Toko tidak ditemukan");

    // Get plan config
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: dto.plan },
    });
    if (!planConfig) throw new NotFoundException("Paket tidak ditemukan");

    // Check if there's already a pending payment
    const pendingPayment = await this.prisma.subscriptionPayment.findFirst({
      where: {
        tenantId: tenant.id,
        status: "PENDING",
      },
    });
    if (pendingPayment) {
      throw new BadRequestException(
        "Anda masih memiliki pembayaran yang sedang diproses. Harap tunggu konfirmasi admin.",
      );
    }

    const affiliateContext = await this.resolveAffiliateForPayment({
      sellerUserId: userId,
      tenantId: tenant.id,
      tenantCity: tenant.city,
      referralCode: dto.referralCode,
    });

    // Create payment record
    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        tenantId: tenant.id,
        plan: dto.plan,
        planName: planConfig.name,
        amount: dto.amount,
        durationDays: dto.durationDays || 30,
        proofImageUrl: dto.proofImageUrl,
        accountName: dto.accountName,
        accountNumber: dto.accountNumber,
        transferDate: dto.transferDate ? new Date(dto.transferDate) : null,
        notes: dto.notes,
        status: "PENDING",
        referralCodeUsed: affiliateContext?.referralCodeUsed,
        affiliateUserId: affiliateContext?.affiliateUserId,
        affiliateType: affiliateContext?.affiliateType,
        affiliateRate: affiliateContext?.affiliateRate,
      },
    });

    // Create notification for admins with realtime delivery
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });

    await Promise.all(
      admins.map(async (admin) => {
        const adminNotification = await this.prisma.notification.create({
          data: {
            userId: admin.id,
            tenantId: tenant.id,
            type: "SUBSCRIPTION_PAYMENT_PENDING",
            title: "Pembayaran Langganan Baru",
            message: `${tenant.name} mengajukan pembayaran langganan ${planConfig.name} sebesar Rp ${dto.amount.toLocaleString("id-ID")}`,
            metadata: {
              paymentId: payment.id,
              tenantId: tenant.id,
              plan: dto.plan,
            },
          },
        });

        // Send realtime notification via WebSocket
        try {
          if (this.notificationEvents['chatGateway']) {
            this.notificationEvents['chatGateway'].sendNotificationToUser(
              admin.id,
              adminNotification,
            );
          }
        } catch (error) {
          this.logger.warn(`Failed to send WebSocket notification to admin ${admin.id}`, error);
        }
      }),
    );

    this.logger.log(
      `Subscription payment created: ${payment.id} for tenant ${tenant.name} (${dto.plan})`,
    );

    return {
      message: "Bukti pembayaran berhasil dikirim. Mohon tunggu konfirmasi dari admin.",
      payment,
    };
  }

  async getSubscriptionPayments(userId: string) {
    try {
      console.log(`[getSubscriptionPayments] Fetching for userId: ${userId}`);
      
      const tenant = await this.prisma.tenant.findFirst({
        where: { ownerId: userId, deletedAt: null },
      });
      
      if (!tenant) {
        console.log(`[getSubscriptionPayments] Tenant not found for userId: ${userId}`);
        throw new BadRequestException("Toko tidak ditemukan");
      }

      const payments = await this.prisma.subscriptionPayment.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
      });

      console.log(`[getSubscriptionPayments] Found ${payments.length} payment records`);
      return { data: payments };
    } catch (error) {
      console.error('[getSubscriptionPayments] Error:', error);
      throw error;
    }
  }

  async getAffiliateDashboard(userId: string) {
    const tenant = await this.getSellerTenantOrThrow(userId);
    this.ensureAffiliateEligible(tenant.subscriptionPlan);

    const profile = await this.ensureAffiliateProfile(userId);
    const bonuses = await this.prisma.affiliateBonus.findMany({
      where: { affiliateUserId: userId },
      include: {
        referredTenant: {
          select: {
            id: true,
            name: true,
            city: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        claim: {
          select: {
            id: true,
            status: true,
            requestedAt: true,
            reviewedAt: true,
            paidAt: true,
            paymentProofUrl: true,
          },
        },
        subscriptionPayment: {
          select: {
            id: true,
            amount: true,
            plan: true,
            createdAt: true,
            reviewedAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const claims = await this.prisma.affiliateClaim.findMany({
      where: { affiliateUserId: userId },
      include: {
        bonuses: {
          select: {
            id: true,
            bonusAmount: true,
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    const sellerCount = new Set(bonuses.map((bonus) => bonus.referredTenantId)).size;
    const subscribedCount = bonuses.length;
    const totalBonus = bonuses.reduce((sum, bonus) => sum + bonus.bonusAmount, 0);
    const pendingBonus = bonuses
      .filter((bonus) => bonus.status === AffiliateBonusStatus.PENDING && !bonus.claimId)
      .reduce((sum, bonus) => sum + bonus.bonusAmount, 0);
    const approvedBonus = bonuses
      .filter((bonus) => bonus.status === AffiliateBonusStatus.APPROVED)
      .reduce((sum, bonus) => sum + bonus.bonusAmount, 0);
    const paidBonus = bonuses
      .filter((bonus) => bonus.status === AffiliateBonusStatus.PAID)
      .reduce((sum, bonus) => sum + bonus.bonusAmount, 0);

    return {
      profile: {
        referralCode: profile.referralCode,
        isActive: profile.isActive,
        isCitySpecial: profile.isCitySpecial,
        city: profile.city,
        defaultBankAccountName: profile.defaultBankAccountName,
        defaultBankAccountNumber: profile.defaultBankAccountNumber,
        defaultBankName: profile.defaultBankName,
      },
      stats: {
        invitedSellers: sellerCount,
        subscribedSellers: subscribedCount,
        totalBonus,
        pendingBonus,
        approvedBonus,
        paidBonus,
      },
      bonuses,
      claims,
    };
  }

  async createAffiliateClaim(userId: string, dto: { 
    notes?: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankName: string;
  }) {
    const tenant = await this.getSellerTenantOrThrow(userId);
    this.ensureAffiliateEligible(tenant.subscriptionPlan);
    const profile = await this.ensureAffiliateProfile(userId);

    // Validate bank account details
    if (!dto.bankAccountName || !dto.bankAccountNumber || !dto.bankName) {
      throw new BadRequestException(
        "Data rekening wajib diisi: nama pemilik, nomor rekening, dan nama bank/provider.",
      );
    }

    const existingPendingClaim = await this.prisma.affiliateClaim.findFirst({
      where: {
        affiliateUserId: userId,
        status: AffiliateClaimStatus.PENDING,
      },
    });

    if (existingPendingClaim) {
      throw new BadRequestException(
        "Anda masih memiliki klaim bonus yang sedang menunggu review admin.",
      );
    }

    const bonuses = await this.prisma.affiliateBonus.findMany({
      where: {
        affiliateUserId: userId,
        status: AffiliateBonusStatus.PENDING,
        claimId: null,
      },
    });

    if (bonuses.length === 0) {
      throw new BadRequestException("Belum ada bonus yang dapat diklaim.");
    }

    const amount = bonuses.reduce((sum, bonus) => sum + bonus.bonusAmount, 0);

    const claim = await this.prisma.affiliateClaim.create({
      data: {
        affiliateUserId: userId,
        amount,
        status: AffiliateClaimStatus.PENDING,
        adminNotes: dto.notes,
        bankAccountName: dto.bankAccountName,
        bankAccountNumber: dto.bankAccountNumber,
        bankName: dto.bankName,
      },
    });

    // Update affiliate profile with default bank account for future use
    await this.prisma.affiliateProfile.update({
      where: { userId },
      data: {
        defaultBankAccountName: dto.bankAccountName,
        defaultBankAccountNumber: dto.bankAccountNumber,
        defaultBankName: dto.bankName,
      },
    });

    await this.prisma.affiliateBonus.updateMany({
      where: {
        id: { in: bonuses.map((bonus) => bonus.id) },
      },
      data: {
        claimId: claim.id,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.prisma.notification.create({
          data: {
            userId: admin.id,
            tenantId: tenant.id,
            type: "AFFILIATE_CLAIM_PENDING",
            title: "Klaim Bonus Affiliate Baru",
            message: `${tenant.name} mengajukan klaim bonus affiliate sebesar Rp ${amount.toLocaleString("id-ID")}.`,
            metadata: {
              claimId: claim.id,
              affiliateUserId: userId,
              amount,
            },
          },
        }),
      ),
    );

    return {
      message: "Klaim bonus berhasil diajukan dan menunggu verifikasi admin.",
      claim,
    };
  }

  /**
   * Search Affiliators - Scalable search for sellers who used the referral code
   * Supports searching by name, email, or tenant ID with pagination
   */
  async searchAffiliators(
    userId: string,
    options: {
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: "createdAt" | "name" | "subscriptionPlan";
      sortOrder?: "asc" | "desc";
    },
  ) {
    const tenant = await this.getSellerTenantOrThrow(userId);
    this.ensureAffiliateEligible(tenant.subscriptionPlan);

    // Ensure affiliate profile exists
    const profile = await this.ensureAffiliateProfile(userId);

    // Pagination defaults
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    const sortBy = options.sortBy || "createdAt";
    const sortOrder = options.sortOrder || "desc";

    // Build search conditions
    const searchConditions: any = {
      referredBy: userId,
      deletedAt: null,
    };

    // If search query provided, search across multiple fields
    if (options.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      searchConditions.OR = [
        // Search by tenant ID
        { id: { contains: searchTerm, mode: "insensitive" } },
        // Search by tenant name
        { name: { contains: searchTerm, mode: "insensitive" } },
        // Search by tenant subdomain
        { subdomain: { contains: searchTerm, mode: "insensitive" } },
        // Search by owner's first name
        { owner: { firstName: { contains: searchTerm, mode: "insensitive" } } },
        // Search by owner's last name
        { owner: { lastName: { contains: searchTerm, mode: "insensitive" } } },
        // Search by owner's email
        { owner: { email: { contains: searchTerm, mode: "insensitive" } } },
      ];
    }

    // Build sort order
    let orderBy: any = {};
    if (sortBy === "name") {
      orderBy = { name: sortOrder };
    } else if (sortBy === "subscriptionPlan") {
      orderBy = { subscriptionPlan: sortOrder };
    } else {
      orderBy = { createdAt: sortOrder };
    }

    // Execute queries in parallel for performance
    const [affiliators, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where: searchConditions,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          subdomain: true,
          city: true,
          subscriptionPlan: true,
          sellerTier: true,
          isActive: true,
          isVerified: true,
          referralCodeUsed: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          subscription: {
            select: {
              id: true,
              plan: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      }),
      this.prisma.tenant.count({ where: searchConditions }),
    ]);

    // Get bonus statistics for each affiliator
    const affiliatorIds = affiliators.map((a) => a.id);
    const bonuses = await this.prisma.affiliateBonus.findMany({
      where: {
        affiliateUserId: userId,
        referredTenantId: { in: affiliatorIds },
      },
      select: {
        referredTenantId: true,
        bonusAmount: true,
        status: true,
        subscriptionAmount: true,
        createdAt: true,
      },
    });

    // Map bonuses to affiliators
    const bonusesByTenant = bonuses.reduce((acc, bonus) => {
      if (!acc[bonus.referredTenantId]) {
        acc[bonus.referredTenantId] = [];
      }
      acc[bonus.referredTenantId].push(bonus);
      return acc;
    }, {} as Record<string, typeof bonuses>);

    // Format response with bonus stats
    const affiliatorsWithStats = affiliators.map((affiliator) => {
      const tenantBonuses = bonusesByTenant[affiliator.id] || [];
      const totalBonus = tenantBonuses.reduce((sum, b) => sum + b.bonusAmount, 0);
      const totalSubscriptionAmount = tenantBonuses.reduce(
        (sum, b) => sum + b.subscriptionAmount,
        0,
      );
      const pendingBonus = tenantBonuses
        .filter((b) => b.status === "PENDING")
        .reduce((sum, b) => sum + b.bonusAmount, 0);
      const paidBonus = tenantBonuses
        .filter((b) => b.status === "PAID")
        .reduce((sum, b) => sum + b.bonusAmount, 0);

      return {
        ...affiliator,
        bonusStats: {
          totalBonus,
          totalSubscriptionAmount,
          pendingBonus,
          paidBonus,
          subscriptionCount: tenantBonuses.length,
          lastSubscriptionDate: tenantBonuses.length > 0 
            ? tenantBonuses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt
            : null,
        },
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: affiliatorsWithStats,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      profile: {
        referralCode: profile.referralCode,
        isActive: profile.isActive,
        isCitySpecial: profile.isCitySpecial,
        city: profile.city,
      },
    };
  }

  async getAllSubscriptionPayments(status?: string) {
    try {
      console.log(`[Subscription Payments] Fetching payments with status: ${status || 'ALL'}`);
      
      const where: any = {};
      if (status) where.status = status;

      const payments = await this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      console.log(`[Subscription Payments] Found ${payments.length} payments`);
      return { data: payments };
    } catch (error) {
      console.error('[Subscription Payments] Error fetching payments:', error);
      throw new BadRequestException(
        `Failed to fetch subscription payments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async reviewSubscriptionPayment(
    adminId: string,
    paymentId: string,
    dto: {
      status: "APPROVED" | "REJECTED";
      reviewNotes?: string;
      rejectionReason?: string;
    },
  ) {
    const payment = await this.prisma.subscriptionPayment.findUnique({
      where: { id: paymentId },
      include: { tenant: true },
    });
    if (!payment) throw new NotFoundException("Pembayaran tidak ditemukan");

    if (payment.status !== "PENDING") {
      throw new BadRequestException("Pembayaran sudah diproses sebelumnya");
    }

    // Update payment status
    const updated = await this.prisma.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: dto.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: dto.reviewNotes,
        rejectionReason: dto.rejectionReason,
      },
    });

    if (dto.status === "APPROVED") {
      // Activate subscription
      const startDate = new Date();
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + payment.durationDays);

      const existingSub = await this.prisma.subscription.findUnique({
        where: { tenantId: payment.tenantId },
      });

      if (existingSub) {
        // Update existing subscription
        await this.prisma.subscription.update({
          where: { tenantId: payment.tenantId },
          data: {
            plan: payment.plan,
            monthlyPrice: payment.amount,
            isActive: true,
            startDate,
            renewalDate,
            lastPaymentAt: new Date(),
            lastPaymentAmount: payment.amount,
            previousPlan: existingSub.plan,
            upgradedAt: new Date(),
          },
        });
      } else {
        // Create new subscription
        await this.prisma.subscription.create({
          data: {
            tenantId: payment.tenantId,
            plan: payment.plan,
            monthlyPrice: payment.amount,
            isActive: true,
            startDate,
            renewalDate,
            lastPaymentAt: new Date(),
            lastPaymentAmount: payment.amount,
          },
        });
      }

      // Get plan config for feature flags and limits
      const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
        where: { plan: payment.plan },
      });

      const newTier = payment.plan === "FREE" ? "FREE" : "MEMBER";

      // Update tenant with ALL subscription fields + feature flags
      await this.prisma.tenant.update({
        where: { id: payment.tenantId },
        data: {
          subscriptionPlan: payment.plan,
          sellerTier: newTier as any,
          subscriptionExpiresAt: renewalDate,
          postsLimit: planConfig?.postsLimit ?? 10,
          // Sync feature flags from plan config
          isVerified: planConfig?.canVerifiedBadge ?? false,
          isFeatured: planConfig?.canFeaturedStore ?? false,
          canHighlightProducts: planConfig?.canHighlightProducts ?? false,
          canPriorityListing: planConfig?.canPriorityListing ?? false,
          canAnalyticsAdvanced: planConfig?.canAdvancedAnalytics ?? false,
        },
      });

      // Create subscription history record
      await this.prisma.subscriptionHistory.create({
        data: {
          tenantId: payment.tenantId,
          fromPlan: payment.tenant.subscriptionPlan,
          toPlan: payment.plan,
          fromTier: payment.tenant.sellerTier,
          toTier: newTier as any,
          amount: payment.amount,
          reason: "upgrade",
          changedBy: adminId,
        },
      });

      if (payment.affiliateUserId && payment.affiliateRate) {
        const affiliateBonusAmount = Math.round(
          payment.amount * payment.affiliateRate,
        );

        await this.prisma.affiliateBonus.upsert({
          where: { subscriptionPaymentId: payment.id },
          create: {
            affiliateUserId: payment.affiliateUserId,
            referredTenantId: payment.tenantId,
            subscriptionPaymentId: payment.id,
            affiliateType: payment.affiliateType || AffiliateType.GENERAL,
            citySnapshot: payment.tenant.city || null,
            rate: payment.affiliateRate,
            subscriptionAmount: payment.amount,
            bonusAmount: affiliateBonusAmount,
            status: AffiliateBonusStatus.PENDING,
          },
          update: {
            affiliateType: payment.affiliateType || AffiliateType.GENERAL,
            citySnapshot: payment.tenant.city || null,
            rate: payment.affiliateRate,
            subscriptionAmount: payment.amount,
            bonusAmount: affiliateBonusAmount,
            status: AffiliateBonusStatus.PENDING,
          },
        });

        await this.prisma.notification.create({
          data: {
            userId: payment.affiliateUserId,
            tenantId: payment.tenantId,
            type: "AFFILIATE_BONUS_PENDING",
            title: "Bonus Affiliate Baru",
            message: `Seller referral ${payment.tenant.name} berhasil berlangganan. Bonus Anda menunggu klaim.`,
            metadata: {
              tenantId: payment.tenantId,
              paymentId: payment.id,
              amount: affiliateBonusAmount,
              affiliateType: payment.affiliateType || AffiliateType.GENERAL,
            },
          },
        });
      }

      // Create notification for seller with realtime delivery
      const sellerNotification = await this.prisma.notification.create({
        data: {
          userId: payment.tenant.ownerId,
          tenantId: payment.tenantId,
          type: "SUBSCRIPTION_ACTIVATED",
          title: "Langganan Diaktifkan",
          message: `Pembayaran langganan ${payment.planName} Anda telah disetujui. Langganan aktif hingga ${renewalDate.toLocaleDateString("id-ID")}.`,
          metadata: {
            paymentId: payment.id,
            plan: payment.plan,
            expiresAt: renewalDate.toISOString(),
          },
        },
      });

      // Send realtime notification to seller via WebSocket
      try {
        if (this.notificationEvents['chatGateway']) {
          this.notificationEvents['chatGateway'].sendNotificationToUser(
            payment.tenant.ownerId,
            sellerNotification,
          );
        }
      } catch (error) {
        this.logger.warn('Failed to send WebSocket notification to seller', error);
      }

      // Send subscription upgrade email to seller (non-blocking)
      const sellerUser = await this.prisma.user.findUnique({
        where: { id: payment.tenant.ownerId },
        select: { email: true, firstName: true },
      });
      if (sellerUser?.email) {
        this.emailService.sendSubscriptionUpgradeEmail(
          sellerUser.email,
          sellerUser.firstName || "Seller",
          payment.planName || payment.plan,
        ).catch(() => {});
      }

      // Create notifications for all admins about successful upgrade with realtime delivery
      const admins = await this.prisma.user.findMany({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      });

      // Create notifications with realtime WebSocket delivery
      await Promise.all(
        admins.map(async (admin) => {
          const adminNotification = await this.prisma.notification.create({
            data: {
              userId: admin.id,
              tenantId: payment.tenantId,
              type: "SUBSCRIPTION_UPGRADED",
              title: "Upgrade Langganan Berhasil",
              message: `${payment.tenant.name} berhasil upgrade ke ${payment.planName} (Rp ${payment.amount.toLocaleString("id-ID")})`,
              metadata: {
                paymentId: payment.id,
                tenantId: payment.tenantId,
                tenantName: payment.tenant.name,
                plan: payment.plan,
                planName: payment.planName,
                amount: payment.amount,
                previousPlan: existingSub?.plan || "FREE",
                expiresAt: renewalDate.toISOString(),
              },
            },
          });

          // Send realtime notification via WebSocket
          try {
            if (this.notificationEvents['chatGateway']) {
              this.notificationEvents['chatGateway'].sendNotificationToUser(
                admin.id,
                adminNotification,
              );
            }
          } catch (error) {
            this.logger.warn(`Failed to send WebSocket notification to admin ${admin.id}`, error);
          }
        }),
      );

      this.logger.log(
        `Subscription activated for tenant ${payment.tenant.name} (${payment.plan})`,
      );
    } else {
      // Create notification for seller (rejected)
      await this.prisma.notification.create({
        data: {
          userId: payment.tenant.ownerId,
          tenantId: payment.tenantId,
          type: "SUBSCRIPTION_REJECTED",
          title: "Pembayaran Ditolak",
          message: `Pembayaran langganan ${payment.planName} Anda ditolak. ${dto.rejectionReason || "Silakan hubungi admin untuk informasi lebih lanjut."}`,
          metadata: {
            paymentId: payment.id,
            plan: payment.plan,
            rejectionReason: dto.rejectionReason,
          },
        },
      });

      this.logger.log(
        `Subscription payment rejected for tenant ${payment.tenant.name} (${payment.plan})`,
      );
    }

    return {
      message: dto.status === "APPROVED" 
        ? "Pembayaran disetujui dan langganan diaktifkan" 
        : "Pembayaran ditolak",
      payment: updated,
    };
  }

  async getAdminAffiliates() {
    try {
      console.log('[Affiliates] Fetching affiliate data');
      
      const affiliates = await this.prisma.affiliateProfile.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              tenants: {
                where: { deletedAt: null },
                take: 1,
                select: {
                  id: true,
                  name: true,
                  city: true,
                  subscriptionPlan: true,
                },
              },
            },
          },
        },
        orderBy: [{ isCitySpecial: "desc" }, { createdAt: "desc" }],
      });

      console.log(`[Affiliates] Found ${affiliates.length} affiliates`);

      const bonusGroups = await this.prisma.affiliateBonus.groupBy({
        by: ["affiliateUserId", "status"],
        _sum: { bonusAmount: true },
        _count: true,
      });

      const statsMap = new Map<string, {
        totalBonus: number;
        invitedSellers: Set<string>;
        pendingBonus: number;
        approvedBonus: number;
        paidBonus: number;
      }>();

      const bonusRows = await this.prisma.affiliateBonus.findMany({
        select: {
          affiliateUserId: true,
          referredTenantId: true,
        },
      });

      bonusRows.forEach((row) => {
        if (!statsMap.has(row.affiliateUserId)) {
          statsMap.set(row.affiliateUserId, {
            totalBonus: 0,
            invitedSellers: new Set<string>(),
            pendingBonus: 0,
            approvedBonus: 0,
            paidBonus: 0,
          });
        }
        statsMap.get(row.affiliateUserId)?.invitedSellers.add(row.referredTenantId);
      });

      bonusGroups.forEach((group) => {
        if (!statsMap.has(group.affiliateUserId)) {
          statsMap.set(group.affiliateUserId, {
            totalBonus: 0,
            invitedSellers: new Set<string>(),
            pendingBonus: 0,
            approvedBonus: 0,
            paidBonus: 0,
          });
        }
        const stats = statsMap.get(group.affiliateUserId)!;
        const amount = group._sum.bonusAmount || 0;
        stats.totalBonus += amount;
        if (group.status === AffiliateBonusStatus.PENDING) stats.pendingBonus += amount;
        if (group.status === AffiliateBonusStatus.APPROVED) stats.approvedBonus += amount;
        if (group.status === AffiliateBonusStatus.PAID) stats.paidBonus += amount;
      });

      const result = affiliates.map((affiliate) => {
        const stats = statsMap.get(affiliate.userId);
        return {
          ...affiliate,
          stats: {
            invitedSellers: stats?.invitedSellers.size || 0,
            totalBonus: stats?.totalBonus || 0,
            pendingBonus: stats?.pendingBonus || 0,
            approvedBonus: stats?.approvedBonus || 0,
            paidBonus: stats?.paidBonus || 0,
          },
        };
      });

      console.log('[Affiliates] Successfully processed affiliate data');
      return { data: result };
    } catch (error) {
      console.error('[Affiliates] Error fetching affiliate data:', error);
      throw new BadRequestException(
        `Failed to fetch affiliate data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async updateAffiliateCityAssignment(
    userId: string,
    dto: {
      isCitySpecial: boolean;
      city?: string;
      isActive?: boolean;
      notes?: string;
    },
    adminUserId: string,
  ) {
    const tenant = await this.getSellerTenantOrThrow(userId);
    this.ensureAffiliateEligible(tenant.subscriptionPlan);

    const profile = await this.ensureAffiliateProfile(userId);
    const cityValue = dto.city?.trim() || tenant.city?.trim() || null;
    const normalizedCity = this.normalizeCity(cityValue);

    if (dto.isCitySpecial) {
      if (!normalizedCity) {
        throw new BadRequestException(
          "Kota wajib diisi untuk affiliate khusus kota.",
        );
      }

      const existingCityAffiliate = await this.prisma.affiliateProfile.findFirst({
        where: {
          isCitySpecial: true,
          city: { equals: normalizedCity, mode: "insensitive" },
          userId: { not: userId },
        },
      });

      if (existingCityAffiliate) {
        throw new BadRequestException(
          "Kota ini sudah memiliki affiliate khusus yang aktif.",
        );
      }
    }

    // Clean data - remove readonly fields (not needed here since we're explicit)
    // But keeping for consistency
    
    const updated = await this.prisma.affiliateProfile.update({
      where: { id: profile.id },
      data: {
        isCitySpecial: dto.isCitySpecial,
        city: dto.isCitySpecial ? cityValue : null,
        isActive: dto.isActive ?? profile.isActive,
        notes: dto.notes ?? profile.notes,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "update",
        entityType: "affiliate_profile",
        entityId: updated.id,
        changes: JSON.stringify({
          isCitySpecial: updated.isCitySpecial,
          city: updated.city,
          isActive: updated.isActive,
        }),
      },
    });

    return {
      message: dto.isCitySpecial
        ? "Affiliate khusus kota berhasil diperbarui."
        : "Affiliate umum berhasil diperbarui.",
      data: updated,
    };
  }

  async getAffiliateClaims(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const claims = await this.prisma.affiliateClaim.findMany({
      where,
      include: {
        affiliateUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            tenants: {
              where: { deletedAt: null },
              take: 1,
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
        bonuses: {
          include: {
            referredTenant: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    return { data: claims };
  }

  async reviewAffiliateClaim(
    claimId: string,
    adminUserId: string,
    dto: {
      status: "APPROVED" | "REJECTED" | "PAID";
      adminNotes?: string;
      rejectionReason?: string;
      paymentProofUrl?: string; // Bukti transfer untuk status PAID
    },
  ) {
    // Check admin role - only SUPER_ADMIN can mark as PAID
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId },
      select: { role: true },
    });

    if (!admin) {
      throw new NotFoundException("Admin tidak ditemukan.");
    }

    if (dto.status === "PAID" && admin.role !== "SUPER_ADMIN") {
      throw new ForbiddenException(
        "Hanya Super Admin yang dapat melakukan payout dan menandai klaim sebagai PAID.",
      );
    }

    const claim = await this.prisma.affiliateClaim.findUnique({
      where: { id: claimId },
      include: { bonuses: true, affiliateUser: true },
    });
    if (!claim) throw new NotFoundException("Klaim affiliate tidak ditemukan.");

    if (dto.status === "PAID" && claim.status !== AffiliateClaimStatus.APPROVED) {
      throw new BadRequestException(
        "Klaim hanya bisa ditandai paid setelah disetujui.",
      );
    }

    if (dto.status === "PAID" && !dto.paymentProofUrl) {
      throw new BadRequestException(
        "Bukti transfer wajib diupload saat melakukan payout.",
      );
    }

    if (
      dto.status !== "PAID" &&
      claim.status !== AffiliateClaimStatus.PENDING
    ) {
      throw new BadRequestException("Klaim ini sudah diproses sebelumnya.");
    }

    const nextBonusStatus =
      dto.status === "APPROVED"
        ? AffiliateBonusStatus.APPROVED
        : dto.status === "PAID"
          ? AffiliateBonusStatus.PAID
          : AffiliateBonusStatus.REJECTED;

    const reviewedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.affiliateClaim.update({
        where: { id: claimId },
        data: {
          status: dto.status as AffiliateClaimStatus,
          reviewedByUserId: adminUserId,
          reviewedAt,
          paidAt: dto.status === "PAID" ? reviewedAt : claim.paidAt,
          adminNotes: dto.adminNotes,
          rejectionReason: dto.rejectionReason,
          paymentProofUrl: dto.status === "PAID" ? dto.paymentProofUrl : claim.paymentProofUrl,
        },
      }),
      this.prisma.affiliateBonus.updateMany({
        where: { claimId },
        data: {
          status: nextBonusStatus,
          approvedAt:
            dto.status === "APPROVED" || dto.status === "PAID"
              ? reviewedAt
              : undefined,
          paidAt: dto.status === "PAID" ? reviewedAt : undefined,
          notes: dto.adminNotes,
        },
      }),
    ]);

    const notificationTenantId = claim.bonuses[0]?.referredTenantId;
    if (!notificationTenantId) {
      throw new BadRequestException(
        "Klaim tidak memiliki bonus terkait untuk notifikasi.",
      );
    }

    await this.prisma.notification.create({
      data: {
        tenantId: notificationTenantId,
        userId: claim.affiliateUserId,
        type:
          dto.status === "PAID"
            ? "AFFILIATE_CLAIM_PAID"
            : dto.status === "APPROVED"
              ? "AFFILIATE_CLAIM_APPROVED"
              : "AFFILIATE_CLAIM_REJECTED",
        title:
          dto.status === "PAID"
            ? "Bonus Affiliate Dibayar"
            : dto.status === "APPROVED"
              ? "Klaim Affiliate Disetujui"
              : "Klaim Affiliate Ditolak",
        message:
          dto.status === "PAID"
            ? `Klaim bonus affiliate Anda sebesar Rp ${claim.amount.toLocaleString("id-ID")} telah dibayar. Silakan cek rekening Anda.`
            : dto.status === "APPROVED"
              ? `Klaim bonus affiliate Anda sebesar Rp ${claim.amount.toLocaleString("id-ID")} telah disetujui admin dan akan segera diproses.`
              : `Klaim bonus affiliate Anda ditolak. ${dto.rejectionReason || ""}`.trim(),
        metadata: {
          claimId: claim.id,
          amount: claim.amount,
          status: dto.status,
        },
      },
    });

    return {
      message:
        dto.status === "PAID"
          ? "Klaim bonus ditandai paid dan bukti transfer berhasil diupload."
          : dto.status === "APPROVED"
            ? "Klaim bonus disetujui."
            : "Klaim bonus ditolak.",
    };
  }

  // ============ SUBSCRIPTION FEATURES ============

  /**
   * Get tenant features based on subscription plan
   */
  async getTenantFeatures(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          where: { deletedAt: null },
          select: { id: true, subscriptionPlan: true },
        },
      },
    });

    if (!user || !user.tenants || user.tenants.length === 0) {
      throw new NotFoundException('Tenant not found');
    }

    const tenant = user.tenants[0];
    const config = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: tenant.subscriptionPlan },
    });

    if (!config) {
      return {
        plan: tenant.subscriptionPlan,
        features: this.getDefaultFeatures(),
      };
    }

    return {
      plan: tenant.subscriptionPlan,
      features: {
        canPublishToMarketplace: config.canPublishToMarketplace,
        canVerifiedBadge: config.canVerifiedBadge,
        canFeaturedStore: config.canFeaturedStore,
        canHighlightProducts: config.canHighlightProducts,
        canPriorityListing: config.canPriorityListing,
        canAdvancedAnalytics: config.canAdvancedAnalytics,
        canBulkUpload: config.canBulkUpload,
        canExportData: config.canExportData,
        canFlashSale: config.canFlashSale,
        canCustomTheme: config.canCustomTheme,
        canRemoveBranding: config.canRemoveBranding,
        canRequestPhysicalVerification: config.canRequestPhysicalVerification,
        canSubmitProposal: (config as any).canSubmitProposal || false,
        canWhatsappCheckout: (config as any).canWhatsappCheckout || false,
        canToolsRecommendation: (config as any).canToolsRecommendation || false,
        canBecomeAffiliate: (config as any).canBecomeAffiliate || false,
        canBoostListing: (config as any).canBoostListing || false,
      },
    };
  }

  /**
   * Check if user has a specific feature
   */
  async checkFeature(userId: string, featureKey: string) {
    const result = await this.getTenantFeatures(userId);
    const hasFeature = (result.features as any)[featureKey] === true;

    return {
      feature: featureKey,
      hasAccess: hasFeature,
      plan: result.plan,
    };
  }

  /**
   * Get default features (all disabled)
   */
  private getDefaultFeatures() {
    return {
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
    };
  }
}
