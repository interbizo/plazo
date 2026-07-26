import api from "@/lib/api";
import type { Notification, PaginatedResponse } from "@/types";

export const buyerApi = {
  // Dashboard
  getDashboard: () => api.get("/api/buyer/dashboard"),
  getActivitySummary: () => api.get("/api/buyer/activity-summary"),
  /* DISABLED - fitur dihapus
  getSpending: (period?: string) =>
    api.get("/api/buyer/spending", { params: { period } }),
  */

  // Profile
  getProfile: () => api.get("/api/buyer/profile"),
  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    bio?: string;
    avatar?: string;
  }) => api.put("/api/buyer/profile", data),

  /* DISABLED - fitur dihapus
  // Cart
  getCart: () => api.get<Cart>("/cart"),
  getCartTotal: () => api.get("/cart/total"),
  addToCart: (productId: string, quantity: number, variantId?: string) =>
    api.post("/cart/items", { productId, quantity, variantId }),
  updateCartItem: (itemId: string, quantity: number) =>
    api.put(`/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  clearCart: () => api.delete("/cart"),
  checkout: (data: {
    notes?: string;
    shipping: {
      name: string;
      phone: string;
      address: string;
      province: string;
      city: string;
      district: string;
      postalCode: string;
      notes?: string;
    };
    savedAddressId?: string;
  }) => api.post("/cart/checkout", data),
  directPurchase: (data: {
    productId: string;
    quantity: number;
    variantId?: string;
    notes?: string;
    shipping: {
      name: string;
      phone: string;
      address: string;
      province: string;
      city: string;
      district: string;
      postalCode: string;
      notes?: string;
    };
    savedAddressId?: string;
  }) => api.post("/cart/direct-purchase", data),

  // Purchases (Orders)
  getPurchases: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => api.get<PaginatedResponse<Order>>("/api/buyer/purchases", { params }),
  getPurchaseDetail: (orderId: string) =>
    api.get(`/api/buyer/purchases/${orderId}`),
  */

  // Jobs
  getMyJobs: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => api.get("/api/buyer/jobs", { params }),
  getJobDetail: (jobId: string) => api.get(`/api/buyer/jobs/${jobId}`),
  getJobProposals: (
    jobId: string,
    params?: { page?: number; limit?: number; status?: string },
  ) => api.get(`/api/buyer/jobs/${jobId}/proposals`, { params }),
  createJob: (data: {
    title: string;
    description: string;
    budget: number;
    categoryId?: string;
    tags?: string[];
    maxProposals?: number | null;
  }) => api.post("/api/jobs", data),
  updateJob: (jobId: string, data: Record<string, unknown>) =>
    api.put(`/api/jobs/${jobId}`, data),
  deleteJob: (jobId: string) => api.delete(`/api/jobs/${jobId}`),

  // Proposals (buyer actions)
  acceptProposal: (proposalId: string) =>
    api.post(`/api/proposals/${proposalId}/accept`),
  rejectProposal: (proposalId: string) =>
    api.post(`/api/proposals/${proposalId}/reject`),

  /* DISABLED - fitur dihapus
  // Orders actions
  respondDelivery: (
    orderId: string,
    deliveryId: string,
    data: { action: "accept" | "request_revision"; revisionNote?: string },
  ) => api.put(`/api/orders/${orderId}/delivery/${deliveryId}/respond`, data),
  cancelOrder: (orderId: string, reason: string) =>
    api.post(`/api/orders/${orderId}/cancel`, { reason }),
  respondCancellation: (
    orderId: string,
    data: { action: "accept" | "decline"; declineReason?: string },
  ) => api.put(`/api/orders/${orderId}/cancel/respond`, data),
  respondExtension: (orderId: string, data: { action: "accept" | "decline" }) =>
    api.put(`/api/orders/${orderId}/extension/respond`, data),
  completeMilestone: (orderId: string, milestoneId: string) =>
    api.post(`/api/orders/${orderId}/milestones/${milestoneId}/complete`),
  getOrderTimeline: (orderId: string) =>
    api.get(`/api/orders/${orderId}/timeline`),

  // Payment
  getPaymentAccounts: (tenantId?: string) =>
    api.get("/api/payment/accounts", { params: tenantId ? { tenantId } : {} }),
  uploadPaymentProof: (data: {
    orderId: string;
    imageUrl: string;
    amount: number;
    paymentMethod: string;
    bankName?: string;
    accountName?: string;
    transactionDate?: string;
    referenceNumber?: string;
  }) => api.post("/api/payment/proof/upload", data),
  getOrderDetail: (orderId: string) => api.get(`/api/orders/${orderId}`),

  // Create Order
  createOrder: (data: {
    title: string;
    amount: number;
    description?: string;
    serviceId?: string;
    packageTier?: string;
    proposalId?: string;
    deliveryDeadline?: string;
  }) => api.post("/api/orders", data),
  */

  // Reviews
  getMyReviews: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/reviews/given", { params }),
  getReceivedReviews: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/reviews/received", { params }),
  createReview: (data: {
    orderId: string;
    rating: number;
    comment?: string;
    productId?: string;
    serviceId?: string;
    images?: string[];
  }) =>
    api.post("/api/reviews", data),

  /* DISABLED - fitur dihapus
  // Transactions
  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/transactions", { params }),

  // Disputes
  getDisputes: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/disputes", { params }),
  */

  // Wishlist
  getWishlist: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/wishlist", { params }),
  addToWishlist: (data: { productId?: string; serviceId?: string }) =>
    api.post("/api/wishlist", data),
  removeFromWishlistById: (wishlistId: string) =>
    api.delete(`/api/wishlist/${wishlistId}`),
  removeFromWishlist: (data: { productId?: string; serviceId?: string }) =>
    api.delete("/api/wishlist", { data }),
  checkWishlist: (params: { productId?: string; serviceId?: string }) =>
    api.get<{ isWishlisted?: boolean; isWished?: boolean }>(
      "/api/wishlist/check",
      { params },
    ),
  isInWishlist: (params: { productId?: string; serviceId?: string }) =>
    api.get("/api/wishlist/check", { params }),

  /* DISABLED - fitur dihapus
  // Disputes
  createDispute: (data: {
    orderId: string;
    reason: string;
    evidence?: string[];
  }) => api.post("/api/disputes", data),
  getDisputeDetail: (disputeId: string) =>
    api.get(`/api/disputes/${disputeId}`),
  */

  /* DISABLED - fitur dihapus
  // Offers
  getOffers: (params?: { page?: number; limit?: number }) =>
    api.get("/api/buyer/offers", { params }),
  respondToOffer: (offerId: string, data: { action: "accept" | "decline" }) =>
    api.post(`/api/offers/${offerId}/${data.action}`),
  getOfferDetail: (offerId: string) => api.get(`/api/offers/${offerId}`),
  */

  // Notifications
  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  }) =>
    api.get<PaginatedResponse<Notification>>("/api/notifications", { params }),
  markAsRead: (notificationId: string) =>
    api.post(`/api/notifications/${notificationId}/read`),
  markAllRead: () => api.post("/api/notifications/read-all"),
  getUnreadCount: () =>
    api.get<{ unreadCount: number }>("/api/notifications/unread-count"),

  // Reports
  submitReport: (data: {
    type: string;
    reason: string;
    description: string;
    targetType?: string;
    targetId?: string;
  }) => api.post("/api/reports", data),
};
