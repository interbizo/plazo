import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // Increased timeout from 15s to 30s to handle slow connections
  timeout: 30000,
  // Enable keep-alive for connection reuse
  transitional: {
    clarifyTimeoutError: true,
  },
});

// ============================================
// RETRY CONFIGURATION
// ============================================

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Check if error is retryable (network errors, timeouts, 5xx errors)
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network errors (no response received)
    return true;
  }
  
  const status = error.response.status;
  // Retry on 5xx server errors and 429 (rate limit)
  return status >= 500 || status === 429 || status === 408;
}

/**
 * Delay function for retry backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// TOKEN MANAGEMENT
// ============================================

const TOKEN_KEY = "plazo_access_token";
const REFRESH_KEY = "plazo_refresh_token";
const TENANT_KEY = "plazo_tenant_subdomain";
const ACCESS_COOKIE_KEY = "token";
const REFRESH_COOKIE_KEY = "refresh_token";
const TENANT_COOKIE_KEY = "tenant_subdomain";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie ? document.cookie.split("; ") : [];
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));

  if (!match) return null;

  const value = match.slice(prefix.length);
  return value ? decodeURIComponent(value) : null;
}

function getSharedCookieDomain(): string {
  if (typeof window === "undefined") return "";

  const hostname = window.location.hostname;
  if (hostname.includes("plazo.id")) {
    return "; domain=.plazo.id";
  }
  if (hostname.includes("plazo.com")) {
    return "; domain=.plazo.com";
  }
  if (hostname.includes("ehftest.dev")) {
    return "; domain=.ehftest.dev";
  }
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return `; domain=.${parts.slice(-2).join(".")}`;
    }
  }

  return "";
}

function setSharedCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const isSecure = window.location.protocol === "https:";
  const cookieDomain = getSharedCookieDomain();
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? "; Secure" : ""}${cookieDomain}`;
}

function clearSharedCookie(name: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;

  const isSecure = window.location.protocol === "https:";
  const cookieDomain = getSharedCookieDomain();
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax${isSecure ? "; Secure" : ""}${cookieDomain}`;
}

export const tokenStorage = {
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY) || getCookieValue(ACCESS_COOKIE_KEY);
  },
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_KEY) || getCookieValue(REFRESH_COOKIE_KEY);
  },
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);

    // Persist both tokens in shared cookies so auth also works across subdomains.
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    setSharedCookie(ACCESS_COOKIE_KEY, accessToken, maxAge);
    setSharedCookie(REFRESH_COOKIE_KEY, refreshToken, maxAge);
  },
  clearTokens: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(TENANT_KEY);

    clearSharedCookie(ACCESS_COOKIE_KEY);
    clearSharedCookie(REFRESH_COOKIE_KEY);
    clearSharedCookie(TENANT_COOKIE_KEY);
  },
  getTenant: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TENANT_KEY) || getCookieValue(TENANT_COOKIE_KEY);
  },
  setTenant: (subdomain: string) => {
    localStorage.setItem(TENANT_KEY, subdomain);
    setSharedCookie(TENANT_COOKIE_KEY, subdomain, 60 * 60 * 24 * 30);
  },
};

// ============================================
// REQUEST INTERCEPTOR — attach JWT + tenant header
// ============================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    
    // Debug logging for delete requests
    if (config.method?.toLowerCase() === 'delete') {
      console.log('[API] DELETE request:', config.url);
      console.log('[API] Token present:', !!token);
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('[API] No token found for request:', config.url);
    }

    const tenant = tokenStorage.getTenant();
    if (tenant) {
      config.headers["x-tenant-subdomain"] = tenant;
    }

    // If sending FormData, remove Content-Type header to let axios set it automatically with boundary
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================
// RESPONSE INTERCEPTOR — handle 401 + refresh
// ============================================

let isRefreshing = false;
let isSuspendRedirecting = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
    };

    // ============================================
    // RETRY LOGIC for network/server errors
    // ============================================
    // Don't retry POST/PUT/PATCH requests to avoid duplicate operations
    const isIdempotent = originalRequest.method?.toUpperCase() === 'GET' || 
                         originalRequest.method?.toUpperCase() === 'DELETE';
    
    if (isRetryableError(error) && !originalRequest._retry && isIdempotent) {
      const retryCount = originalRequest._retryCount || 0;
      
      if (retryCount < MAX_RETRIES) {
        originalRequest._retryCount = retryCount + 1;
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = RETRY_DELAY * Math.pow(2, retryCount);
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES}) after ${delayMs}ms...`);
        }
        await delay(delayMs);
        
        return api(originalRequest);
      }
    }

    // ============================================
    // SUSPENDED USER CHECK — must be BEFORE token refresh
    // ============================================
    if (error.response?.status === 401) {
      const responseData = error.response?.data as { message?: string } | undefined;
      const message = responseData?.message || "";
      if (typeof message === "string" && message.includes("suspend")) {
        // Clear tokens immediately — suspended user should not stay logged in
        tokenStorage.clearTokens();
        if (typeof window !== "undefined" && !isSuspendRedirecting && !window.location.pathname.includes("/account-suspended")) {
          isSuspendRedirecting = true;
          window.location.href = "/account-suspended";
        }
        return Promise.reject(error);
      }
    }

    // ============================================
    // TOKEN REFRESH LOGIC for 401 errors
    // ============================================
    // Skip refresh for auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
          refreshToken,
        }, {
          timeout: 10000, // 10 second timeout for refresh
        });

        const newAccessToken = data.accessToken;
        const newRefreshToken = data.refreshToken || refreshToken;

        tokenStorage.setTokens(newAccessToken, newRefreshToken);

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        tokenStorage.clearTokens();

        // Check if refresh failed due to suspension
        const refreshErrData = (refreshError as any)?.response?.data as { message?: string } | undefined;
        const refreshErrMsg = refreshErrData?.message || "";
        const isSuspended = typeof refreshErrMsg === "string" && refreshErrMsg.includes("suspend");

        // Redirect appropriately
        if (typeof window !== "undefined") {
          if (isSuspended && !isSuspendRedirecting && !window.location.pathname.includes("/account-suspended")) {
            isSuspendRedirecting = true;
            window.location.href = "/account-suspended";
          } else if (!isSuspended && !window.location.pathname.includes('/login')) {
            window.location.href = "/login?session=expired";
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ============================================
// HELPER: extract error message
// ============================================

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] : data.message;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

export default api;
