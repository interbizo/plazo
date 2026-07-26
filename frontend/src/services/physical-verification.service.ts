import api from "@/lib/api";

export const physicalVerificationApi = {
  // Seller endpoints
  checkEligibility: () => api.get("/api/physical-verification/eligibility"),

  getStatus: () => api.get("/api/physical-verification/status"),

  requestVerification: (data: {
    businessName: string;
    businessAddress: string;
    businessCity?: string;
    businessPhone?: string;
    requestNotes?: string;
  }) => api.post("/api/physical-verification/request", data),

  getCertificate: () => api.get("/api/physical-verification/certificate"),

  // Admin endpoints
  getAllVerifications: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => api.get("/api/physical-verification/admin/all", { params }),

  getStatistics: () => api.get("/api/physical-verification/admin/stats"),

  getVerificationById: (id: string) =>
    api.get(`/api/physical-verification/admin/${id}`),

  scheduleVisit: (id: string, data: { scheduledDate: string; notes?: string }) =>
    api.put(`/api/physical-verification/admin/${id}/schedule`, data),

  uploadVisitPhotos: (id: string, data: { visitPhotos: string[]; notes?: string }) =>
    api.put(`/api/physical-verification/admin/${id}/photos`, data),

  approveVerification: (
    id: string,
    data: { verificationNotes: string; visitedDate?: string }
  ) => api.put(`/api/physical-verification/admin/${id}/approve`, data),

  rejectVerification: (id: string, data: { rejectionReason: string }) =>
    api.put(`/api/physical-verification/admin/${id}/reject`, data),

  uploadCertificate: (id: string, data: { certificateUrl: string }) =>
    api.post(`/api/physical-verification/admin/${id}/certificate`, data),
};
