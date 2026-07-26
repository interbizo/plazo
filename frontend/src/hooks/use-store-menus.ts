"use client";

import { useEffect, useState } from "react";
import { marketplaceApi } from "@/services/marketplace.service";

interface StoreMenu {
  id: string;
  label: string;
  type: "page" | "products" | "services" | "external" | "custom";
  url?: string;
  pageSlug?: string;
  icon?: string;
  isVisible: boolean;
  sortOrder: number;
  parentId?: string;
  children?: StoreMenu[];
}

export function useStoreMenus(subdomain: string) {
  const [menus, setMenus] = useState<StoreMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        setIsLoading(true);
        const { data } = await marketplaceApi.getStoreMenus(subdomain);
        setMenus(data.menus || []);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setMenus([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (subdomain) {
      fetchMenus();
    }
  }, [subdomain]);

  return { menus, isLoading, error };
}
