import api from "@/lib/api";

export const reviewApi = {
  getSellerReviews: (
    sellerId: string,
    params?: { page?: number; limit?: number; rating?: number; hasImages?: boolean },
  ) => api.get(`/api/reviews/seller/${sellerId}`, { params }),

  getProductReviews: (
    productId: string,
    params?: { page?: number; limit?: number; rating?: number; hasImages?: boolean },
  ) => api.get(`/api/reviews/product/${productId}`, { params }),

  getServiceReviews: (
    serviceId: string,
    params?: { page?: number; limit?: number; rating?: number; hasImages?: boolean },
  ) => api.get(`/api/reviews/service/${serviceId}`, { params }),

  createReview: (data: {
    chatTransactionId?: string;
    orderId?: string;
    rating: number;
    comment?: string;
    productId?: string;
    serviceId?: string;
    images?: string[];
  }) => api.post("/api/reviews", data),

  canReviewOrder: (
    orderId: string,
    params?: { productId?: string; serviceId?: string },
  ) => api.get(`/api/reviews/can-review/${orderId}`, { params }),

  getOrderReview: (orderId: string) =>
    api.get(`/api/reviews/order/${orderId}`),
};
