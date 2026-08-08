import { SetMetadata } from '@nestjs/common';

export const FEATURE_FLAG_KEY = 'feature_flag';

/** Menandai rute/controller memerlukan feature flag platform tertentu aktif. Contoh: @RequireFeatureFlag('module.forum') */
export const RequireFeatureFlag = (flagKey: string) =>
  SetMetadata(FEATURE_FLAG_KEY, flagKey);
