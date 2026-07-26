import { create } from "zustand";
import api, { tokenStorage } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "BUYER" | "SELLER";
  turnstileToken: string;
  storeName?: string;
  storeSubdomain?: string;
  storeCity?: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password, turnstileToken) => {
    const { data } = await api.post("/api/auth/login", { email, password, turnstileToken });
    tokenStorage.setTokens(data.accessToken, data.refreshToken);

    if (data.user?.tenantSubdomain) {
      tokenStorage.setTenant(data.user.tenantSubdomain);
    }

    // Clear any pending verification data on successful login
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pendingVerification');
    }

    set({ user: data.user, isAuthenticated: true, isLoading: false });

    // If user is suspended, redirect to appeal page
    if (data.suspended || data.user?.accountStatus === "SUSPENDED" || data.user?.accountStatus === "UNDER_APPEAL") {
      if (typeof window !== "undefined") {
        window.location.href = "/account-suspended";
      }
    }
  },

  register: async (registerData) => {
    console.log('📤 [AUTH STORE] Sending register request with data:', registerData);
    const response = await api.post("/api/auth/register", registerData);
    console.log('📥 [AUTH STORE] Full axios response:', response);
    console.log('📦 [AUTH STORE] Response data:', response.data);
    console.log('🔍 [AUTH STORE] requiresVerification:', response.data?.requiresVerification);
    console.log('🔍 [AUTH STORE] verificationMethods:', response.data?.verificationMethods);
    return response.data;
  },

  logout: () => {
    tokenStorage.clearTokens();
    
    // Clear pending verification data
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('pendingVerification');
    }
    
    set({ user: null, isAuthenticated: false, isLoading: false });
    window.location.href = "/login";
  },

  fetchUser: async () => {
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const { data } = await Promise.race([
        api.get("/api/auth/profile"),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000),
        ),
      ]);

      const userData = data.user || data;

      // Check if user is suspended — redirect immediately
      if (userData?.accountStatus === "SUSPENDED" || userData?.accountStatus === "UNDER_APPEAL") {
        if (typeof window !== "undefined" && !window.location.pathname.includes("/account-suspended")) {
          tokenStorage.clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
          window.location.href = "/account-suspended";
          return;
        }
      }

      if (userData?.tenantSubdomain) {
        tokenStorage.setTenant(userData.tenantSubdomain);
      }

      set({ user: userData, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "";
      
      if (status === 401) {
        // Check if suspended — redirect to appeal page
        if (typeof message === "string" && message.includes("suspend")) {
          if (typeof window !== "undefined" && !window.location.pathname.includes("/account-suspended")) {
            tokenStorage.clearTokens();
            set({ user: null, isAuthenticated: false, isLoading: false });
            window.location.href = "/account-suspended";
            return;
          }
        }
        tokenStorage.clearTokens();
        set({ user: null, isAuthenticated: false, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },
}));
