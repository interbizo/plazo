import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionFeaturesService } from '../services/subscription-features.service';
import { REQUIRED_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { SubscriptionFeature } from '../types/subscription-features.types';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionFeaturesService: SubscriptionFeaturesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureMetadata = this.reflector.getAllAndOverride<{
      feature: SubscriptionFeature;
      featureName?: string;
    }>(REQUIRED_FEATURE_KEY, [context.getHandler(), context.getClass()]);

    if (!featureMetadata) {
      // No feature requirement, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get tenant ID from request.tenant (set by TenantMiddleware) or fallback to user/headers
    const tenantId = request.tenant?.id || user.tenantId || request.headers['x-tenant-id'];

    if (!tenantId) {
      throw new ForbiddenException('Tenant not found. Pastikan Anda mengakses dari subdomain toko Anda.');
    }

    // Check if tenant has the required feature
    const hasFeature = await this.subscriptionFeaturesService.hasFeature(
      tenantId,
      featureMetadata.feature,
    );

    if (!hasFeature) {
      const featureName = featureMetadata.featureName || this.getFeatureDisplayName(featureMetadata.feature);
      throw new ForbiddenException(
        `Fitur "${featureName}" tidak tersedia di paket langganan Anda. Silakan upgrade paket untuk mengakses fitur ini.`
      );
    }

    return true;
  }

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
