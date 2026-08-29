import api from "@/lib/api";

export interface ShippingDestination {
  id: number;
  label: string;
  provinceName?: string;
  cityName?: string;
  districtName?: string;
  subdistrictName?: string;
  zipCode?: string;
}

export interface ShippingOption {
  courierName: string;
  courierCode: string;
  service: string;
  description?: string;
  cost: number;
  etd?: string;
}

export interface ProductShippingEstimate {
  origin: ShippingDestination;
  destinationId: number;
  weightGram: number;
  courier: string;
  cheapest: ShippingOption;
  options: ShippingOption[];
}

function normalizeLocationName(value?: string) {
  return (value || "")
    .toUpperCase()
    .replace(/^(KOTA|KABUPATEN)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const destinationSearchCache = new Map<string, ShippingDestination[]>();

function getCachedDestinations(key: string) {
  const memoryCache = destinationSearchCache.get(key);
  if (memoryCache) return memoryCache;

  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(`shipping:destinations:${key}`);
  if (!raw) return null;

  try {
    const cached = JSON.parse(raw) as ShippingDestination[];
    destinationSearchCache.set(key, cached);
    return cached;
  } catch {
    window.sessionStorage.removeItem(`shipping:destinations:${key}`);
    return null;
  }
}

function setCachedDestinations(key: string, destinations: ShippingDestination[]) {
  destinationSearchCache.set(key, destinations);
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      `shipping:destinations:${key}`,
      JSON.stringify(destinations),
    );
  }
}
export const shippingApi = {
  searchDestinations: (search: string, limit = 10) =>
    api.get<{ data: ShippingDestination[] }>("/api/shipping/destinations", {
      params: { search, limit },
    }),

  searchDestinationsForLocation: async (
    city: string,
    province: string,
    district?: string,
  ) => {
    const search = [district, city, province].filter(Boolean).join(", ").trim();
    if (search.length < 3) return [];

    const cacheKey = [
      normalizeLocationName(province),
      normalizeLocationName(city),
      normalizeLocationName(district),
    ].join("|");
    const cached = getCachedDestinations(cacheKey);
    if (cached) return cached;

    const { data } = await shippingApi.searchDestinations(search, 50);
    const normalizedCity = normalizeLocationName(city);
    const normalizedProvince = normalizeLocationName(province);
    const normalizedDistrict = normalizeLocationName(district);

    const destinations = (data.data || []).filter(
      (destination) =>
        normalizeLocationName(destination.cityName) === normalizedCity &&
        normalizeLocationName(destination.provinceName) === normalizedProvince &&
        (!district ||
          normalizeLocationName(destination.districtName) === normalizedDistrict),
    );

    setCachedDestinations(cacheKey, destinations);
    return destinations;
  },


  estimateProduct: (data: {
    productId: string;
    destinationId: number;
    quantity?: number;
    courier?: string;
  }) => api.post<{ data: ProductShippingEstimate }>("/api/shipping/estimate", data),
};