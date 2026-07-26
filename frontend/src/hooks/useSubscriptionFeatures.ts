import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { SubscriptionFeature, SubscriptionFeatures } from '@/types/subscription-features';

interface UseSubscriptionFeaturesReturn {
  features: SubscriptionFeatures | null;
  plan: string | null;
  isLoading: boolean;
  hasFeature: (feature: SubscriptionFeature) => boolean;
  checkFeature: (feature: SubscriptionFeature) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useSubscriptionFeatures(): UseSubscriptionFeaturesReturn {
  const [features, setFeatures] = useState<SubscriptionFeatures | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFeatures = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/subscription/features');
      setFeatures(data.features);
      setPlan(data.plan);
    } catch (error) {
      console.error('Failed to fetch subscription features:', error);
      setFeatures(null);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const hasFeature = (feature: SubscriptionFeature): boolean => {
    if (!features) return false;
    return features[feature] === true;
  };

  const checkFeature = async (feature: SubscriptionFeature): Promise<boolean> => {
    try {
      const { data } = await api.get(`/api/subscription/features/check/${feature}`);
      return data.hasAccess === true;
    } catch (error) {
      console.error('Failed to check feature:', error);
      return false;
    }
  };

  return {
    features,
    plan,
    isLoading,
    hasFeature,
    checkFeature,
    refetch: fetchFeatures,
  };
}

/**
 * Hook to require a specific feature
 * Throws error if feature is not available
 */
export function useRequireFeature(feature: SubscriptionFeature, featureName?: string) {
  const { hasFeature, isLoading } = useSubscriptionFeatures();

  useEffect(() => {
    if (!isLoading && !hasFeature(feature)) {
      const displayName = featureName || feature;
      throw new Error(
        `Fitur "${displayName}" tidak tersedia di paket langganan Anda. Silakan upgrade paket untuk mengakses fitur ini.`
      );
    }
  }, [feature, featureName, hasFeature, isLoading]);

  return { isLoading, hasAccess: hasFeature(feature) };
}
