import api from "@/lib/api";

const BASE = "/api/admin";

export const adminApi = {
  /* DISABLED - fitur dihapus
  // Dashboard / Analytics
  getPlatformStats: () => api.get(`${BASE}/analytics/platform`),
  getRecentActivity: (limit?: number) =>
    api.get(`${BASE}/analytics/recent`, { params: { limit } }),
  getSubscriptionStats: () => api.get(`${BASE}/analytics/subscriptions`),
  getRevenueAnalytics: (period?: string) =>
    api.get(`${BASE}/analytics/revenue`, { params: { period } }),
  getUsersGrowth: (months?: number) =>
    api.get(`${BASE}/analytics/users-growth`, { params: { months } }),
  getTopSellers: (limit?: number) =>
    api.get(`${BASE}/analytics/top-sellers`, { params: { limit } }),
  getTopProducts: (limit?: number) =>
    api.get(`${BASE}/analytics/top-products`, { params: { limit } }),
  */

  // Users
  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    isActive?: boolean;
  }) => api.get(`${BASE}/users`, { params }),
  getUserDetail: (id: string) => api.get(`${BASE}/users/${id}`),
  createUser: (data: Record<string, unknown>) =>
    api.post(`${BASE}/users`, data),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/users/${id}`, data),
  banUser: (id: string) => api.post(`${BASE}/users/${id}/ban`),
  unbanUser: (id: string) => api.post(`${BASE}/users/${id}/unban`),
  deleteUser: (id: string) => api.delete(`${BASE}/users/${id}`),
  changeUserRole: (userId: string, role: string, reason?: string) =>
    api.put(`${BASE}/users/${userId}/role`, { role, reason }),
  getUserDetails: (userId: string) =>
    api.get(`${BASE}/users/${userId}/details`),

  // Tenants
  getTenants: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`${BASE}/tenants`, { params }),
  getTenantDetail: (id: string) => api.get(`${BASE}/tenants/${id}`),
  updateTenant: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/tenants/${id}`, data),
  suspendTenant: (id: string) => api.post(`${BASE}/tenants/${id}/suspend`),
  activateTenant: (id: string) => api.post(`${BASE}/tenants/${id}/activate`),
  changeTenantPlan: (tenantId: string, plan: string, reason?: string) =>
    api.put(`${BASE}/tenants/${tenantId}/subscription`, { plan, reason }),
  verifyStore: (id: string, data: { isVerified: boolean }) =>
    api.put(`${BASE}/tenants/${id}/verify`, data),
  featureStore: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/tenants/${id}/feature`, data),
  updateTenantSeo: (id: string, data: { isSeoActive: boolean }) =>
    api.patch(`${BASE}/tenants/${id}/seo`, data),

  /* DISABLED - fitur dihapus
  // Orders
  getOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get(`${BASE}/orders`, { params }),
  getOrderDetail: (id: string) => api.get(`${BASE}/orders/${id}`),
  forceOrderStatus: (id: string, status: string) =>
    api.put(`${BASE}/orders/${id}/status`, { status }),
  cancelOrder: (id: string, reason: string) =>
    api.post(`${BASE}/orders/${id}/cancel`, { reason }),

  // Payment Verification
  getPendingPayments: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/api/payment/admin/proofs", { params }),
  getPaymentProofDetail: (proofId: string) =>
    api.get(`/api/payment/proof/${proofId}`),
  verifyPaymentProof: (proofId: string, data: { action: "VERIFY" | "REJECT"; reason?: string }) =>
    api.put(`/api/payment/proof/${proofId}/verify`, data),
  getPaymentStats: () =>
    api.get("/api/payment/admin/stats"),
  */

  // Products & Services Moderation
  getProducts: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`${BASE}/products`, { params }),
  getInternalProducts: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isPublished?: boolean;
  }) => api.get(`${BASE}/products/internal`, { params }),
  getInternalProduct: (id: string) => api.get(`${BASE}/products/internal/${id}`),
  createInternalProduct: (data: Record<string, unknown>) =>
    api.post(`${BASE}/products/internal`, data),
  updateInternalProduct: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/products/internal/${id}`, data),
  deleteInternalProduct: (id: string) =>
    api.delete(`${BASE}/products/internal/${id}`),
  moderateProduct: (
    id: string,
    data: { isPublished: boolean; reason?: string },
  ) => api.put(`${BASE}/products/${id}/moderate`, data),
  deleteProduct: (id: string) => api.delete(`${BASE}/products/${id}`),
  // Don't set Content-Type header explicitly - let axios set it automatically with boundary
  uploadFiles: (formData: FormData) =>
    api.post("/api/upload/multiple", formData),
  getServices: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`${BASE}/services`, { params }),
  getInternalServices: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isPublished?: boolean;
  }) => api.get(`${BASE}/services/internal`, { params }),
  getInternalService: (id: string) => api.get(`${BASE}/services/internal/${id}`),
  createInternalService: (data: Record<string, unknown>) =>
    api.post(`${BASE}/services/internal`, data),
  updateInternalService: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/services/internal/${id}`, data),
  deleteInternalService: (id: string) =>
    api.delete(`${BASE}/services/internal/${id}`),
  moderateService: (
    id: string,
    data: { isPublished: boolean; reason?: string },
  ) => api.put(`${BASE}/services/${id}/moderate`, data),
  deleteService: (id: string) => api.delete(`${BASE}/services/${id}`),

  // Categories
  getCategories: (params?: { type?: string }) =>
    api.get(`${BASE}/categories`, { params }),
  createCategory: (data: {
    name: string;
    slug: string;
    description?: string;
    type: string;
  }) => api.post(`${BASE}/categories`, data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`${BASE}/categories/${id}`),

  // KYC
  getKycSubmissions: (params?: { page?: number; status?: string }) =>
    api.get(`${BASE}/kyc`, { params }),
  getKycDetail: (id: string) => api.get(`${BASE}/kyc/${id}`),
  getKycFileUrl: (id: string, type: "ktp" | "selfie") =>
    `${BASE}/kyc/${id}/file/${type}`,
  reviewKyc: (id: string, data: { action: string; rejectionReason?: string }) =>
    api.put(`${BASE}/kyc/${id}/review`, data),

  /* DISABLED - fitur dihapus
  // Withdrawals
  getWithdrawals: (params?: { page?: number; status?: string }) =>
    api.get(`${BASE}/withdrawals`, { params }),
  processWithdrawal: (id: string, data: { action: string; reason?: string }) =>
    api.put(`${BASE}/withdrawals/${id}/process`, data),

  // Disputes
  getDisputes: (params?: { page?: number; status?: string }) =>
    api.get(`${BASE}/disputes`, { params }),
  getDisputeDetail: (id: string) => api.get(`${BASE}/disputes/${id}`),
  resolveDispute: (
    id: string,
    data: { resolution: string; adminNotes?: string },
  ) => api.put(`${BASE}/disputes/${id}/resolve`, data),
  */

  // Reports
  getReports: (params?: {
    page?: number;
    status?: string;
    targetType?: string;
  }) => api.get(`${BASE}/reports`, { params }),
  getReportDetail: (id: string) => api.get(`${BASE}/reports/${id}`),
  resolveReport: (id: string, data: { action: string; adminNotes?: string }) =>
    api.put(`${BASE}/reports/${id}/resolve`, data),

  // Reviews
  getReviews: (params?: { page?: number; limit?: number }) =>
    api.get(`${BASE}/reviews`, { params }),
  deleteReview: (id: string, reason?: string) =>
    api.delete(`${BASE}/reviews/${id}`, { data: { reason } }),

  // Broadcast
  broadcast: (data: { title: string; message: string; targetRole?: string }) =>
    api.post(`${BASE}/broadcast`, data),

  // Audit Logs
  getAuditLogs: (params?: {
    page?: number;
    limit?: number;
    entityType?: string;
  }) => api.get(`${BASE}/audit-logs`, { params }),

  /* DISABLED - fitur dihapus
  // Transactions
  getTransactions: (params?: {
    page?: number;
    type?: string;
    status?: string;
  }) => api.get(`${BASE}/transactions`, { params }),
  getTransactionDetail: (id: string) => api.get(`${BASE}/transactions/${id}`),
  */

  // Jobs
  getJobs: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => api.get(`${BASE}/jobs`, { params }),
  moderateJob: (id: string, data: { isPublished?: boolean; status?: string; reason?: string }) => {
    // Backend expects { status: string }, map isPublished to status if needed
    const payload = data.status
      ? data
      : { status: data.isPublished ? "OPEN" : "CANCELLED", reason: data.reason };
    return api.put(`${BASE}/jobs/${id}/moderate`, payload);
  },
  deleteJob: (id: string) => api.delete(`${BASE}/jobs/${id}`),

  // User & Subscription Stats (tetap aktif — bukan analytics transaksi)
  getRoleStats: () => api.get(`${BASE}/stats/roles`),
  getSubscriptionPlanStats: () => api.get(`${BASE}/stats/subscriptions`),

  // Subscriptions
  getSubscriptions: (params?: {
    page?: number;
    limit?: number;
    plan?: string;
  }) => api.get(`${BASE}/subscriptions`, { params }),
  updateSubscription: (tenantId: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/subscriptions/${tenantId}`, data),

  /* DISABLED - fitur dihapus
  // Promotions
  getPromotions: (params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }) => api.get(`${BASE}/promotions`, { params }),
  createPromotion: (data: Record<string, unknown>) =>
    api.post(`${BASE}/promotions`, data),
  updatePromotion: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/promotions/${id}`, data),
  deletePromotion: (id: string) => api.delete(`${BASE}/promotions/${id}`),
  */

  // Boosts
  getBoosts: () => api.get(`${BASE}/boosts`),
  getPremiumSellersForBoost: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get(`${BASE}/boosts/premium-sellers`, { params }),
  createBoost: (data: Record<string, unknown>) => {
    // Map frontend field names to backend DTO: listingType -> type, durationDays -> days
    const payload: Record<string, unknown> = {
      listingId: data.listingId,
      type: ((data.listingType as string) || (data.type as string) || "product").toLowerCase(),
      days: data.durationDays || data.days || 7,
    };
    return api.post(`${BASE}/boosts`, payload);
  },
  removeBoost: (data: { listingId: string; listingType: string }) => {
    // Map listingType -> type (lowercase)
    return api.post(`${BASE}/boosts/remove`, {
      listingId: data.listingId,
      type: (data.listingType || "product").toLowerCase(),
    });
  },

  // Chats
  getChatRooms: (params?: { page?: number; limit?: number }) =>
    api.get(`${BASE}/chats`, { params }),
  getChatMessages: (
    roomId: string,
    params?: { page?: number; limit?: number },
  ) => api.get(`${BASE}/chats/${roomId}/messages`, { params }),

  // Featured stores
  getFeaturedStores: () => api.get(`${BASE}/featured-stores`),

  // Seller levels
  setSellerLevel: (userId: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/sellers/${userId}/level`, data),

  // Notifications management
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    type?: string;
  }) => api.get(`${BASE}/notifications`, { params }),
  deleteNotification: (id: string) => api.delete(`${BASE}/notifications/${id}`),
  cleanupNotifications: (daysOld?: number) =>
    api.post(`${BASE}/notifications/cleanup`, { daysOld }),

  // Bulk actions
  bulkUserAction: (data: Record<string, unknown>) =>
    api.post(`${BASE}/users/bulk`, data),

  // CMS (backend route: /admin/cms/*)
  getCmsPages: () => api.get(`${BASE}/cms/pages`),
  getCmsPage: (id: string) => api.get(`${BASE}/cms/pages/${id}`),
  createCmsPage: (data: Record<string, unknown>) =>
    api.post(`${BASE}/cms/pages`, data),
  updateCmsPage: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/pages/${id}`, data),
  deleteCmsPage: (id: string) => api.delete(`${BASE}/cms/pages/${id}`),
  getCmsBanners: () => api.get(`${BASE}/cms/banners`),
  createCmsBanner: (data: Record<string, unknown>) =>
    api.post(`${BASE}/cms/banners`, data),
  updateCmsBanner: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/banners/${id}`, data),
  deleteCmsBanner: (id: string) => api.delete(`${BASE}/cms/banners/${id}`),
  getCmsSettings: (group?: string) =>
    api.get(`${BASE}/cms/settings`, { params: group ? { group } : {} }),
  updateCmsSettings: (data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/settings`, data),
  bulkUpdateCmsSettings: (
    settings: Array<{ key: string; value: string; group?: string; description?: string }>,
  ) => api.put(`${BASE}/cms/settings/bulk`, { settings }),
  getCmsFaqs: () => api.get(`${BASE}/cms/faqs`),
  createCmsFaq: (data: Record<string, unknown>) =>
    api.post(`${BASE}/cms/faqs`, data),
  updateCmsFaq: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/faqs/${id}`, data),
  deleteCmsFaq: (id: string) => api.delete(`${BASE}/cms/faqs/${id}`),

  // Flash Sale Events
  getFlashSaleEvents: () => api.get(`${BASE}/cms/flash-sale/events`),
  createFlashSaleEvent: (data: { name: string; startDate: string; endDate: string; isActive?: boolean }) =>
    api.post(`${BASE}/cms/flash-sale/events`, data),
  updateFlashSaleEvent: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/flash-sale/events/${id}`, data),
  deleteFlashSaleEvent: (id: string) =>
    api.delete(`${BASE}/cms/flash-sale/events/${id}`),

  // Flash Sale Items
  getFlashSaleItems: (params?: { status?: string; position?: string }) =>
    api.get(`${BASE}/cms/flash-sale`, { params }),
  createFlashSaleItem: (data: Record<string, unknown>) =>
    api.post(`${BASE}/cms/flash-sale`, data),
  updateFlashSaleItem: (id: string, data: Record<string, unknown>) =>
    api.put(`${BASE}/cms/flash-sale/${id}`, data),
  approveFlashSaleItem: (id: string) =>
    api.post(`${BASE}/cms/flash-sale/${id}/approve`),
  rejectFlashSaleItem: (id: string, reason: string) =>
    api.post(`${BASE}/cms/flash-sale/${id}/reject`, { reason }),
  deleteFlashSaleItem: (id: string) =>
    api.delete(`${BASE}/cms/flash-sale/${id}`),

  // Subscription Plan Config (Super Admin)
  getSubscriptionPlans: () =>
    api.get("/api/subscription/admin/plans"),
  getSubscriptionPlan: (id: string) =>
    api.get(`/api/subscription/admin/plans/${id}`),
  createSubscriptionPlan: (data: Record<string, unknown>) =>
    api.post("/api/subscription/admin/plans", data),
  updateSubscriptionPlan: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/subscription/admin/plans/${id}`, data),
  deleteSubscriptionPlan: (id: string) =>
    api.delete(`/api/subscription/admin/plans/${id}`),
  changeTenantSubscription: (tenantId: string, plan: string) =>
    api.post(`/api/subscription/admin/change-plan/${tenantId}`, { plan }),
  checkExpiredSubscriptions: () =>
    api.post("/api/subscription/admin/check-expired"),

  // Subscription Payments
  getSubscriptionPayments: (status?: string) =>
    api.get("/api/subscription/admin/payments", { params: status ? { status } : {} }),
  reviewSubscriptionPayment: (paymentId: string, data: {
    status: "APPROVED" | "REJECTED";
    reviewNotes?: string;
    rejectionReason?: string;
  }) => api.post(`/api/subscription/admin/payments/${paymentId}/review`, data),
  getAffiliates: () => api.get("/api/subscription/admin/affiliates"),
  updateAffiliateCity: (
    userId: string,
    data: {
      isCitySpecial: boolean;
      city?: string;
      isActive?: boolean;
      notes?: string;
    },
  ) => api.put(`/api/subscription/admin/affiliates/${userId}/city`, data),
  getAffiliateClaims: (status?: string) =>
    api.get("/api/subscription/admin/affiliate-claims", {
      params: status ? { status } : {},
    }),
  reviewAffiliateClaim: (
    claimId: string,
    data: {
      status: "APPROVED" | "REJECTED" | "PAID";
      adminNotes?: string;
      rejectionReason?: string;
      paymentProofUrl?: string;
    },
  ) => api.patch(`/api/subscription/admin/affiliate/claims/${claimId}/review`, data),

  // Platform Payment Accounts (via Subscription module)
  getPlatformPaymentAccounts: () =>
    api.get("/api/subscription/admin/payment-accounts"),
  createPlatformPaymentAccount: (data: {
    type: "BANK_TRANSFER" | "E_WALLET";
    bankName?: string;
    accountNumber: string;
    accountName: string;
    walletType?: string;
    phoneNumber?: string;
    isActive?: boolean;
    isPrimary?: boolean;
  }) => api.post("/api/subscription/admin/payment-accounts", data),
  updatePlatformPaymentAccount: (id: string, data: {
    type?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    walletType?: string;
    phoneNumber?: string;
    isActive?: boolean;
    isPrimary?: boolean;
  }) => api.put(`/api/subscription/admin/payment-accounts/${id}`, data),
  deletePlatformPaymentAccount: (id: string) =>
    api.delete(`/api/subscription/admin/payment-accounts/${id}`),

  // ============ RECOMMENDED TOOLS ============
  getRecommendedTools: () => api.get("/api/recommended-tools/admin/all"),
  getRecommendedTool: (id: string) => api.get(`/api/recommended-tools/admin/${id}`),
  createRecommendedTool: (data: any) => api.post("/api/recommended-tools", data),
  updateRecommendedTool: (id: string, data: any) => api.put(`/api/recommended-tools/${id}`, data),
  deleteRecommendedTool: (id: string) => api.delete(`/api/recommended-tools/${id}`),
  toggleRecommendedToolStatus: (id: string) => api.patch(`/api/recommended-tools/${id}/toggle-status`),

  // ============ DATABASE BACKUP ============
  getDatabaseStats: () => api.get(`${BASE}/database/stats`),
  createDatabaseBackup: () => api.post(`${BASE}/database/backup`),
  listDatabaseBackups: () => api.get(`${BASE}/database/backups`),
  downloadDatabaseBackup: (filename: string) => 
    api.get(`${BASE}/database/backups/${filename}/download`, { responseType: 'blob' }),
  deleteDatabaseBackup: (filename: string) => 
    api.delete(`${BASE}/database/backups/${filename}`),
  restoreDatabaseBackup: (filename: string) => 
    api.post(`${BASE}/database/backups/${filename}/restore`),
  getBackupConfig: () => api.get(`${BASE}/database/backup-config`),
  testDriveConnection: () => api.post(`${BASE}/database/backup-config/test-drive`),
};
