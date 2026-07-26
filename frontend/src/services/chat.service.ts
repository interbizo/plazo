import api from "@/lib/api";

export const chatApi = {
  getRooms: (params?: { page?: number; limit?: number }) =>
    api.get("/api/chat/rooms", { params }),
  getMessages: (roomId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/api/chat/room/${roomId}/messages`, { params }),
  openRoom: (data: {
    tenantId: string;
    targetUserId: string;
    productId?: string;
    serviceId?: string;
    jobId?: string;
    itemTitle?: string;
    // Product details
    variantName?: string;
    quantity?: number;
    price?: number;
    // Service details
    packageTier?: string;
    packageTitle?: string;
    packagePrice?: number;
    packageDescription?: string;
  }) => api.post("/api/chat/open", data),
  sendMessage: (data: {
    roomId: string;
    text: string;
    attachments?: string[];
  }) => api.post("/api/chat/send", data),
  markRead: (roomId: string) => api.post(`/api/chat/room/${roomId}/mark-read`),
  markTransactionComplete: (transactionId: string) =>
    api.post(`/api/chat/transaction/${transactionId}/complete`),
  getRoomTransactions: (roomId: string) =>
    api.get(`/api/chat/room/${roomId}/transactions`),
  getCompletedTransactions: () =>
    api.get("/api/chat/transactions/completed"),
  getSellerTransactions: (status?: string) =>
    api.get("/api/chat/transactions/seller", { params: { status } }),
};
