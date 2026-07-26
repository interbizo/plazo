import { SetMetadata } from '@nestjs/common';
import { SubscriptionFeature } from '../types/subscription-features.types';

export const REQUIRED_FEATURE_KEY = 'requiredFeature';

/**
 * Decorator to require a specific subscription feature
 * Usage: @RequireFeature(SubscriptionFeature.SUBMIT_PROPOSAL)
 */
export const RequireFeature = (feature: SubscriptionFeature, featureName?: string) =>
  SetMetadata(REQUIRED_FEATURE_KEY, { feature, featureName });
