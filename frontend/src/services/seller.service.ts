import api from "@/lib/api";
import type {
  Product,
  Service,
  Job,
  Proposal,
  Order,
  Review,
  Subscription,
  SellerStats,
  PaginatedResponse,
  ApiResponse,
  CMSPage,
} from "@/types/api";

export const sellerApi = {
  // Dashboard
  getDashboard: () => 
    api.get<ApiResponse<SellerStats>>("/api/seller/dashboard"),
  getSystemDashboard: () => 
    api.get<ApiResponse<any>>("/api/seller/dashboard/system"),

  // Profile
  getProfile: () => 
    api.get<ApiResponse<any>>("/api/seller/profile"),
  updateProfile: (data: Record<string, unknown>) =>
    api.put<ApiResponse<any>>("/api/seller/profile", data),
  updateCv: (data: Record<string, unknown>) => 
    api.put<ApiResponse<any>>("/api/seller/cv", data),

  // Store Settings
  getStoreSettings: () => 
    api.get<ApiResponse<any>>("/api/seller/store"),
  updateStoreSettings: (data: Record<string, unknown>) =>
    api.put<ApiResponse<any>>("/api/seller/store", data),

  // Store Pages CMS
  getStorePages: () => 
    api.get<ApiResponse<CMSPage[]>>("/api/seller/store/pages"),
  getStorePage: (pageId: string) =>
    api.get<ApiResponse<CMSPage>>(`/api/seller/store/pages/${pageId}`),
  createStorePage: (data: {
    slug: string;
    title: string;
    content: string;
    excerpt?: string;
    isPublished?: boolean;
    sortOrder?: number;
    metaTitle?: string;
    metaDescription?: string;
  }) => api.post<ApiResponse<CMSPage>>("/api/seller/store/pages", data),
  updateStorePage: (pageId: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<CMSPage>>(`/api/seller/store/pages/${pageId}`, data),
  deleteStorePage: (pageId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/api/seller/store/pages/${pageId}`),

  // Store Menus
  getStoreMenus: () =>
    api.get<ApiResponse<any>>("/api/seller/store/menus"),
  getStoreMenu: (menuId: string) =>
    api.get<ApiResponse<any>>(`/api/seller/store/menus/${menuId}`),
  createStoreMenu: (data: {
    label: string;
    type: string;
    url?: string;
    pageSlug?: string;
    icon?: string;
    isVisible?: boolean;
    sortOrder?: number;
    parentId?: string;
  }) => api.post<ApiResponse<any>>("/api/seller/store/menus", data),
  updateStoreMenu: (menuId: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<any>>(`/api/seller/store/menus/${menuId}`, data),
  deleteStoreMenu: (menuId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/api/seller/store/menus/${menuId}`),

  /* DISABLED - fitur dihapus
  // Analytics
  getAnalytics: (period?: string) =>
    api.get("/api/seller/analytics", { params: { period } }),
  getOrderAnalytics: () => api.get("/api/seller/analytics/orders"),
  getTopListings: () => api.get("/api/seller/analytics/top-listings"),

  // Revenue & Financial
  getEarnings: (period?: string) =>
    api.get("/api/seller/earnings", { params: { period } }),
  getRevenueBreakdown: (period?: string) =>
    api.get("/api/seller/revenue", { params: { period } }),
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
  }) => api.get("/api/seller/transactions", { params }),
  getWithdrawals: (params?: { page?: number; limit?: number }) =>
    api.get("/api/seller/withdrawals", { params }),
  getBalance: () => api.get("/api/seller/balance"),
  */

  // Products
  getProducts: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Product>>("/api/seller/products", { params }),
  getProduct: (productId: string) =>
    api.get<ApiResponse<Product>>(`/api/seller/products/${productId}`),
  createProduct: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Product>>("/api/products", data),
  updateProduct: (productId: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Product>>(`/api/products/${productId}`, data),
  deleteProduct: (productId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/api/products/${productId}`),

  // Services
  getServices: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Service>>("/api/seller/services", { params }),
  getService: (serviceId: string) =>
    api.get<ApiResponse<Service>>(`/api/seller/services/${serviceId}`),
  createService: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Service>>("/api/services", data),
  updateService: (serviceId: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<Service>>(`/api/services/${serviceId}`, data),
  deleteService: (serviceId: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/api/services/${serviceId}`),

  // Service Packages
  createServicePackage: (serviceId: string, data: Record<string, unknown>) =>
    api.post(`/api/services/${serviceId}/packages`, data),
  createServicePackagesBulk: (
    serviceId: string,
    data: Record<string, unknown>[],
  ) => api.post(`/api/services/${serviceId}/packages/bulk`, data),
  updateServicePackage: (
    serviceId: string,
    packageId: string,
    data: Record<string, unknown>,
  ) => api.put(`/api/services/${serviceId}/packages/${packageId}`, data),
  deleteServicePackage: (serviceId: string, packageId: string) =>
    api.delete(`/api/services/${serviceId}/packages/${packageId}`),
  getServicePackages: (serviceId: string) =>
    api.get(`/api/services/${serviceId}/packages`),

  /* DISABLED - fitur dihapus
  // Orders
  getOrders: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => api.get("/api/seller/orders", { params }),
  getOrderDetail: (orderId: string) => api.get(`/api/orders/${orderId}`),
  deliverOrder: (orderId: string, data: Record<string, unknown>) =>
    api.post(`/api/orders/${orderId}/deliver`, data),
  updateOrderStatus: (orderId: string, data: { status: string }) =>
    api.put(`/api/orders/${orderId}/status`, data),
  requestExtension: (
    orderId: string,
    data: { extraDays: number; reason: string },
  ) => api.post(`/api/orders/${orderId}/extension`, data),
  */

  // File Upload
  // Don't set Content-Type header explicitly - let axios set it automatically with boundary
  uploadFiles: (formData: FormData) =>
    api.post("/api/upload/multiple", formData),

  // Reviews
  getReviews: (params?: { page?: number; limit?: number }) =>
    api.get("/api/seller/reviews", { params }),
  getReviewStats: () => api.get("/api/seller/reviews/stats"),

  // Proposals
  getProposals: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/api/seller/proposals", { params }),
  getProposalStats: () => api.get("/api/seller/proposals/stats"),
  createProposal: (data: {
    jobId: string;
    bidPrice: number;
    message: string;
    attachments?: string[];
  }) => api.post("/api/proposals", data),
  updateProposal: (
    proposalId: string,
    data: { bidPrice?: number; message?: string },
  ) => api.put(`/api/proposals/${proposalId}`, data),

  /* DISABLED - fitur dihapus
  // Custom offers
  getCustomOffers: (params?: { page?: number; limit?: number }) =>
    api.get("/api/seller/custom-offers", { params }),
  createCustomOffer: (data: {
    buyerId: string;
    title: string;
    description: string;
    price: number;
    deliveryDays: number;
    revisions: number;
  }) => api.post("/api/offers", data),

  // Disputes
  getDisputes: (params?: { page?: number; limit?: number }) =>
    api.get("/api/seller/disputes", { params }),
  */

  // Verification / KYC
  getVerificationStatus: () => api.get("/api/seller/verification"),
  submitKyc: (data: {
    ktpNumber: string;
    fullName: string;
    address?: string;
    dateOfBirth?: string;
    ktpPhotoPath: string;
    selfieWithKtpPath: string;
  }) => api.post("/api/kyc/submit", data),

  // Notifications
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  }) => api.get("/api/notifications", { params }),
  markNotificationRead: (id: string) =>
    api.post(`/api/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post("/api/notifications/read-all"),
  getNotificationCount: () => api.get("/api/seller/notifications/count"),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>("/api/notifications/unread-count"),

  /* DISABLED - fitur dihapus
  // @deprecated Use getTransactions instead
  getSellerTransactions: (params?: {
    page?: number;
    limit?: number;
    type?: string;
  }) => api.get("/api/seller/transactions", { params }),
  */

  // Portfolio
  getPortfolio: () => api.get("/api/seller/portfolio"),
  addPortfolioItem: (data: Record<string, unknown>) =>
    api.post("/api/seller/portfolio", data),
  updatePortfolioItem: (itemId: string, data: Record<string, unknown>) =>
    api.put(`/api/seller/portfolio/${itemId}`, data),
  deletePortfolioItem: (itemId: string) =>
    api.delete(`/api/seller/portfolio/${itemId}`),

  // Categories (for product/service forms)
  getCategories: (type?: string) =>
    api.get("/api/categories", { params: type ? { type } : {} }),

  // Subscription
  getSubscriptionPlans: () => api.get("/api/subscription/plans"),
  getCurrentSubscription: () => api.get("/api/subscription/current"),
  getSubscriptionHistory: () => api.get("/api/subscription/history"),
  changePlan: (plan: string) =>
    api.post("/api/subscription/change-plan", { plan }),
  cancelSubscription: () => api.post("/api/subscription/cancel"),
  updateAutoRenew: (autoRenew: boolean) =>
    api.put("/api/subscription/auto-renew", { autoRenew }),

  // Subscription Payment
  createSubscriptionPayment: (data: {
    plan: string;
    amount: number;
    durationDays?: number;
    proofImageUrl: string;
    accountName?: string;
    accountNumber?: string;
    transferDate?: string;
    notes?: string;
    referralCode?: string;
  }) => api.post("/api/subscription/payment", data),
  getSubscriptionPayments: () => api.get("/api/subscription/payments"),
  getAffiliateDashboard: () => api.get("/api/subscription/affiliate/dashboard"),
  createAffiliateClaim: (data: { 
    bankAccountName: string;
    bankAccountNumber: string;
    bankName: string;
    notes?: string;
  }) =>
    api.post("/api/subscription/affiliate/claim", data),

  // Marketplace Visibility
  toggleProductMarketplace: (productId: string, publish: boolean) =>
    api.patch(`/api/products/${productId}/marketplace-visibility`, { publish }),
  toggleServiceMarketplace: (serviceId: string, publish: boolean) =>
    api.patch(`/api/services/${serviceId}/marketplace-visibility`, { publish }),

  // Boost / Top Ads
  boostProduct: (productId: string, days: number = 7) =>
    api.post(`/api/products/${productId}/boost`, {}, { params: { days } }),
  boostService: (serviceId: string, days: number = 7) =>
    api.post(`/api/services/${serviceId}/boost`, {}, { params: { days } }),
  boostJob: (jobId: string, days: number = 7) =>
    api.post(`/api/jobs/${jobId}/boost`, {}, { params: { days } }),
  getBoosts: () => api.get("/api/seller/boosts"),

  // ============ RECOMMENDED TOOLS ============
  getRecommendedTools: () => api.get("/api/recommended-tools"),
  getRecommendedTool: (id: string) => api.get(`/api/recommended-tools/${id}`),

  // Flash Sale / Promotions
  getFlashSaleItems: () => api.get("/api/seller/flash-sale"),
  submitFlashSaleItem: (data: {
    productId?: string;
    serviceId?: string;
    salePrice: number;
    originalPrice: number;
    startDate?: string;
    endDate?: string;
    position?: string;
  }) => api.post("/api/seller/flash-sale", data),
};
