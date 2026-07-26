import api from "@/lib/api";
import type {
  PaginatedResponse,
  Product,
  Service,
  Job,
  Category,
} from "@/types";

export type SortBy =
  | "newest"
  | "price_low"
  | "price_high"
  | "popular"
  | "rating"
  | "best_seller";

export interface BrowseParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string;
  sortBy?: SortBy;
}

export const marketplaceApi = {
  // Homepage
  getHomepage: () => api.get("/api/public/homepage"),

  // Products
  getProducts: (params?: BrowseParams) =>
    api.get<PaginatedResponse<Product>>("/api/public/products", { params }),

  getProductBySlug: (slug: string) =>
    api.get<{ product: Product }>(`/api/public/products/${slug}`),

  trackProductView: (productId: string) =>
    api.post(`/api/public/products/${productId}/view`, {}),

  // Services
  getServices: (params?: BrowseParams) =>
    api.get<PaginatedResponse<Service>>("/api/public/services", { params }),

  getServiceBySlug: (slug: string) =>
    api.get<{ service: Service }>(`/api/public/services/${slug}`),

  trackServiceView: (serviceId: string) =>
    api.post(`/api/public/services/${serviceId}/view`, {}),

  // Jobs
  getJobs: (params?: BrowseParams & { status?: string }) =>
    api.get<PaginatedResponse<Job>>("/api/public/jobs", { params }),

  getJobBySlug: (slug: string) =>
    api.get<{ job: Job }>(`/api/public/jobs/${slug}`),

  // Sellers
  getSellers: (params?: { page?: number; limit?: number; search?: string; city?: string }) =>
    api.get("/api/public/sellers", { params }),

  // Storefront
  getStorefront: (subdomain: string) =>
    api.get(`/api/public/store/${subdomain}`),

  getStoreProducts: (subdomain: string, params?: BrowseParams) =>
    api.get(`/api/public/store/${subdomain}/products`, { params }),

  getStoreProductBySlug: (subdomain: string, slug: string) =>
    api.get<{ product: Product }>(
      `/api/public/store/${subdomain}/products/${slug}`,
    ),

  getStoreServices: (subdomain: string, params?: BrowseParams) =>
    api.get(`/api/public/store/${subdomain}/services`, { params }),

  getStoreServiceBySlug: (subdomain: string, slug: string) =>
    api.get<{ service: Service }>(
      `/api/public/store/${subdomain}/services/${slug}`,
    ),

  getStorePage: (subdomain: string, slug: string) =>
    api.get(`/api/public/store/${subdomain}/pages/${slug}`),

  getStoreMenus: (subdomain: string) =>
    api.get(`/api/public/store/${subdomain}/menus`),

  // Categories
  getCategories: (type?: string) =>
    api.get<Category[]>("/api/categories", { params: type ? { type } : {} }),

  // CMS Banners (public)
  getCmsBanners: (position?: string) =>
    api.get("/api/public/cms/banners", { params: { position } }),

  // Flash Sale (public)
  getFlashSaleItems: (position?: string) =>
    api.get("/api/public/cms/flash-sale", { params: { position } }),

  // Site Settings (public)
  getSiteSettings: (group?: string) =>
    api.get("/api/public/cms/settings", group ? { params: { group } } : undefined),

  // FAQs (public)
  getFaqs: (category?: string) =>
    api.get("/api/public/cms/faqs", category ? { params: { category } } : undefined),
};
