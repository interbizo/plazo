/**
 * Server-side API fetcher for Next.js Server Components.
 * Uses native fetch (not Axios) so it works in RSC context.
 * Supports Next.js caching and revalidation.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions {
  revalidate?: number | false; // seconds, or false for no cache
  tags?: string[];
  headers?: Record<string, string>;
}

export async function serverFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { revalidate = 60, tags, headers = {} } = options;

  const url = `${API_URL}${path}`;

  // For public routes, we don't need tenant header
  // Backend middleware should handle /api/public/ routes as global
  const isPublicRoute = path.startsWith('/api/public/') || path.startsWith('/api/categories');
  
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Only add tenant header for non-public routes if available
  // Public marketplace routes should work without tenant
  if (!isPublicRoute) {
    const tenantSubdomain = process.env.NEXT_PUBLIC_TENANT_SUBDOMAIN;
    if (tenantSubdomain) {
      requestHeaders["x-tenant-subdomain"] = tenantSubdomain;
    }
  }

  try {
    const res = await fetch(url, {
      headers: requestHeaders,
      next: {
        revalidate: revalidate === false ? 0 : revalidate,
        ...(tags && { tags }),
      },
    });

    if (!res.ok) {
      let errorBody = "";
      let errorJson: any = null;
      
      try {
        const text = await res.text();
        errorBody = text;
        // Try to parse as JSON for better error details
        try {
          errorJson = JSON.parse(text);
        } catch {
          // Not JSON, keep as text
        }
      } catch {
        errorBody = "Could not read response body";
      }

      const errorDetails = {
        url,
        status: res.status,
        statusText: res.statusText,
        body: errorBody,
        parsed: errorJson,
      };

      console.error(`API error at ${url}:`, errorDetails);
      
      // Throw error with more context
      const errorMessage = errorJson?.message || errorJson?.error || errorBody || res.statusText;
      throw new Error(`API ${res.status}: ${errorMessage}`);
    }

    // Handle empty response
    const text = await res.text();
    if (!text || text.trim() === '') {
      console.error(`Empty response from ${url}`);
      throw new Error('Empty response from server');
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseError) {
      console.error(`Failed to parse JSON from ${url}:`, {
        text: text.substring(0, 200),
        error: parseError instanceof Error ? parseError.message : String(parseError),
      });
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// ============================================
// PUBLIC API (Server-side)
// ============================================

export const serverApi = {
  // Products
  getProducts: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    return serverFetch<any>(`/api/public/products${qs ? `?${qs}` : ""}`, {
      revalidate: 30,
      tags: ["products"],
    });
  },

  getProductBySlug: (slug: string) =>
    serverFetch<{ product: any }>(`/api/public/products/${slug}`, {
      revalidate: 60,
      tags: ["product-detail"],
    }),

  // Services
  getServices: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    return serverFetch<any>(`/api/public/services${qs ? `?${qs}` : ""}`, {
      revalidate: 30,
      tags: ["services"],
    });
  },

  getServiceBySlug: (slug: string) =>
    serverFetch<{ service: any }>(`/api/public/services/${slug}`, {
      revalidate: 60,
      tags: ["service-detail"],
    }),

  // Jobs
  getJobs: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    return serverFetch<any>(`/api/public/jobs${qs ? `?${qs}` : ""}`, {
      revalidate: 30,
      tags: ["jobs"],
    });
  },

  getJobBySlug: (slug: string) =>
    serverFetch<{ job: any }>(`/api/public/jobs/${slug}`, {
      revalidate: 60,
      tags: ["job-detail"],
    }),

  // Articles
  getArticles: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    return serverFetch<any>(`/api/public/articles${qs ? `?${qs}` : ""}`, {
      revalidate: 60,
      tags: ["articles"],
    });
  },

  getArticleBySlug: (slug: string) =>
    serverFetch<any>(`/api/public/articles/${slug}`, {
      revalidate: 60,
      tags: ["article-detail"],
    }),

  getArticleCategories: () =>
    serverFetch<any>("/api/public/article-categories", {
      revalidate: 300,
      tags: ["article-categories"],
    }),

  // Categories
  getCategories: (type?: string) => {
    const qs = type ? `?type=${type}` : "";
    return serverFetch<any>(`/api/categories${qs}`, {
      revalidate: 300, // 5 minutes — categories change rarely
      tags: ["categories"],
    });
  },

  // Public feature flags (server-side)
  getPublicFlags: () =>
    serverFetch<Record<string, string>>("/api/public/platform-settings", {
      revalidate: 30,
      tags: ["platform-settings"],
    }),

  // Forum (public posts — used by global search)
  getForumPosts: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          searchParams.set(k, String(v));
        }
      });
    }
    const qs = searchParams.toString();
    return serverFetch<any>(`/api/forum/posts${qs ? `?${qs}` : ""}`, {
      revalidate: 30,
      tags: ["forum-posts"],
    });
  },

  // Storefront
  getStorefront: (subdomain: string) =>
    serverFetch<any>(`/api/public/store/${subdomain}`, {
      revalidate: 60,
      tags: ["storefront"],
    }),

  // CMS
  getCmsBanners: (position?: string) => {
    const qs = position ? `?position=${position}` : "";
    return serverFetch<any>(`/api/public/cms/banners${qs}`, {
      revalidate: 120,
      tags: ["banners"],
    });
  },

  getFlashSaleItems: (position?: string) => {
    const qs = position ? `?position=${position}` : "";
    return serverFetch<any>(`/api/public/cms/flash-sale${qs}`, {
      revalidate: 30,
      tags: ["flash-sale"],
    });
  },

  getSiteSettings: (group?: string) => {
    const qs = group ? `?group=${group}` : "";
    return serverFetch<any>(`/api/public/cms/settings${qs}`, {
      revalidate: 300,
      tags: ["site-settings"],
    });
  },
};
