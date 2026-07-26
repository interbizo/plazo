import api from "@/lib/api";
import type { 
  LoginResponse, 
  Login2FAResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ProfileResponse,
  User,
  ApiResponse,
} from "@/types/api";

export const authApi = {
  login: (email: string, password: string, returnUrl?: string) => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    return api.post<LoginResponse | Login2FAResponse>(`/api/auth/login${params}`, { email, password });
  },

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: "BUYER" | "SELLER";
    phone?: string;
    storeName?: string;
    storeSubdomain?: string;
    storeCity?: string;
  }) => api.post<RegisterResponse>("/api/auth/register", data),

  me: () => api.get<ProfileResponse>("/api/auth/profile"),

  verifyEmail: (token: string) => 
    api.post<ApiResponse<{ message: string }>>("/api/auth/verify-email", { token }),

  forgotPassword: (email: string, turnstileToken: string) =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/forgot-password", { email, turnstileToken }),

  resetPassword: (token: string, newPassword: string, turnstileToken: string) =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/reset-password", { token, newPassword, turnstileToken }),

  refreshToken: (refreshToken: string) =>
    api.post<RefreshTokenResponse>("/api/auth/refresh", { refreshToken }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/change-password", data),

  updateProfile: (data: { 
    avatar?: string; 
    firstName?: string; 
    lastName?: string; 
    phone?: string; 
    bio?: string;
  }) => api.patch<ApiResponse<User>>("/api/auth/profile", data),

  logout: () => 
    api.post<ApiResponse<{ message: string }>>("/api/auth/logout"),

  logoutAll: () =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/logout-all"),

  // SSO endpoints
  ssoCheck: () => 
    api.get<ApiResponse<{ authenticated: boolean; user: User }>>("/api/auth/sso/check"),

  ssoLoginUrl: (returnUrl?: string) => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    return api.get<{ loginUrl: string }>(`/api/auth/sso/login-url${params}`);
  },

  ssoRegisterUrl: (returnUrl?: string) => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : "";
    return api.get<{ registerUrl: string }>(`/api/auth/sso/register-url${params}`);
  },

  validateReturnUrl: (url: string) =>
    api.get<{ valid: boolean }>(`/api/auth/sso/validate-url?url=${encodeURIComponent(url)}`),

  // OTP WhatsApp endpoints
  verifyOtp: (phone: string, code: string, type: 'REGISTRATION' | 'FORGOT_PASSWORD') =>
    api.post<ApiResponse<{ message: string; userId?: string }>>("/api/auth/verify-otp", { phone, code, type }),

  resendOtp: (phone: string, type: 'REGISTRATION' | 'FORGOT_PASSWORD') =>
    api.post<ApiResponse<{ message: string; cooldown?: number }>>("/api/auth/resend-otp", { phone, type }),

  forgotPasswordOtp: (phone: string) =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/forgot-password-otp", { phone }),

  resetPasswordOtp: (phone: string, code: string, newPassword: string) =>
    api.post<ApiResponse<{ message: string }>>("/api/auth/reset-password-otp", { phone, code, newPassword }),
};
