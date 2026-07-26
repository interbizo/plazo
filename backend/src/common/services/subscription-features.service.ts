import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/database/prisma.service';
import { SubscriptionPlan } from '@prisma/client';
import { SubscriptionFeature, SubscriptionFeatures } from '../types/subscription-features.types';

@Injectable()
export class SubscriptionFeaturesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get subscription features for a tenant
   */
  async getTenantFeatures(tenantId: string): Promise<SubscriptionFeatures> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { subscriptionPlan: true },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    return this.getPlanFeatures(tenant.subscriptionPlan);
  }

  /**
   * Get features for a specific subscription plan
   */
  async getPlanFeatures(plan: SubscriptionPlan): Promise<SubscriptionFeatures> {
    const config = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan },
    });

    if (!config) {
      // Return default features if config not found
      return this.getDefaultFeatures();
    }

    return {
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
      canSubmitProposal: config.canSubmitProposal,
      canWhatsappCheckout: config.canWhatsappCheckout,
      canToolsRecommendation: config.canToolsRecommendation,
      canBecomeAffiliate: config.canBecomeAffiliate,
      canBoostListing: config.canBoostListing,
    };
  }

  /**
   * Check if tenant has a specific feature
   */
  async hasFeature(tenantId: string, feature: SubscriptionFeature): Promise<boolean> {
    const features = await this.getTenantFeatures(tenantId);
    return features[feature] === true;
  }

  /**
   * Check if tenant has a specific feature, throw error if not
   */
  async requireFeature(tenantId: string, feature: SubscriptionFeature, featureName?: string): Promise<void> {
    const hasAccess = await this.hasFeature(tenantId, feature);
    
    if (!hasAccess) {
      const displayName = featureName || this.getFeatureDisplayName(feature);
      throw new ForbiddenException(
        `Fitur "${displayName}" tidak tersedia di paket langganan Anda. Silakan upgrade paket untuk mengakses fitur ini.`
      );
    }
  }

  /**
   * Check if a plan has a specific feature
   */
  async planHasFeature(plan: SubscriptionPlan, feature: SubscriptionFeature): Promise<boolean> {
    const features = await this.getPlanFeatures(plan);
    return features[feature] === true;
  }

  /**
   * Get all available plans with their features
   */
  async getAllPlansWithFeatures() {
    const configs = await this.prisma.subscriptionPlanConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return configs.map(config => ({
      plan: config.plan,
      name: config.name,
      description: config.description,
      monthlyPrice: config.monthlyPrice,
      yearlyPrice: config.yearlyPrice,
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
        canSubmitProposal: config.canSubmitProposal,
        canWhatsappCheckout: config.canWhatsappCheckout,
        canToolsRecommendation: config.canToolsRecommendation,
        canBecomeAffiliate: config.canBecomeAffiliate,
        canBoostListing: config.canBoostListing,
      },
      limits: {
        postsLimit: config.postsLimit,
        maxImagesPerPost: config.maxImagesPerPost,
        maxFileSize: config.maxFileSize,
      },
    }));
  }

  /**
   * Get default features (all disabled)
   */
  private getDefaultFeatures(): SubscriptionFeatures {
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

  /**
   * Get human-readable feature name
   */
  private getFeatureDisplayName(feature: SubscriptionFeature): string {
    const names: Record<SubscriptionFeature, string> = {
      [SubscriptionFeature.PUBLISH_MARKETPLACE]: 'Publish Marketplace',
      [SubscriptionFeature.VERIFIED_BADGE]: 'Badge Terverifikasi',
      [SubscriptionFeature.FEATURED_STORE]: 'Featured Homepage',
      [SubscriptionFeature.HIGHLIGHT_PRODUCTS]: 'Highlight Produk',
      [SubscriptionFeature.PRIORITY_LISTING]: 'Priority Listing',
      [SubscriptionFeature.ADVANCED_ANALYTICS]: 'Advanced Analytics',
      [SubscriptionFeature.BULK_UPLOAD]: 'Bulk Upload',
      [SubscriptionFeature.EXPORT_DATA]: 'Export Data',
      [SubscriptionFeature.FLASH_SALE]: 'Flash Sale',
      [SubscriptionFeature.CUSTOM_THEME]: 'Custom Theme',
      [SubscriptionFeature.REMOVE_BRANDING]: 'Remove Branding',
      [SubscriptionFeature.PHYSICAL_VERIFICATION]: 'Verifikasi Kunjungan Fisik',
      [SubscriptionFeature.SUBMIT_PROPOSAL]: 'Kirim Proposal Job',
      [SubscriptionFeature.WHATSAPP_CHECKOUT]: 'Beli via WhatsApp',
      [SubscriptionFeature.TOOLS_RECOMMENDATION]: 'Tools Rekomendasi Seller',
      [SubscriptionFeature.BECOME_AFFILIATE]: 'Affiliate Seller',
      [SubscriptionFeature.BOOST_LISTING]: 'Boost / Top Ads',
    };

    return names[feature] || feature;
  }
}
