"use client";

import { useEffect, useState } from "react";
import { marketplaceApi } from "@/services/marketplace.service";
import type { Tenant, User, SellerProfile, Product, Service, Review } from "@/types";

interface StoreData {
  store: Tenant & {
    owner?: User & { sellerProfile?: SellerProfile };
    storePages?: Array<{ id: string; slug: string; title: string }>;
  };
  stats: {
    averageRating: number;
    totalReviews: number;
    totalProducts: number;
    totalServices: number;
  };
  products: Product[];
  services: Service[];
  reviews: Review[];
}

export function useStorefront(subdomain: string) {
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        setIsLoading(true);
        const { data } = await marketplaceApi.getStorefront(subdomain);
        setStoreData(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setStoreData(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain) {
      fetchStore();
    }
  }, [subdomain]);

  return { storeData, isLoading, error };
}
