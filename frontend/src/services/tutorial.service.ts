import api from "@/lib/api";

export const tutorialApi = {
  // Public endpoints
  getTutorials: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    targetRole?: string;
    search?: string;
  }) => {
    try {
      // Ensure targetRole is uppercase if provided
      const normalizedParams = {
        ...params,
        targetRole: params?.targetRole?.toUpperCase(),
      };
      return await api.get("/api/tutorials", { params: normalizedParams });
    } catch (error) {
      console.error('Error fetching tutorials:', error);
      // Return empty result instead of throwing
      return {
        data: {
          data: [],
          total: 0,
          page: params?.page || 1,
          limit: params?.limit || 20,
          totalPages: 0,
        },
      };
    }
  },

  getFeaturedTutorials: async (targetRole?: string) => {
    try {
      // Ensure targetRole is uppercase if provided
      const normalizedRole = targetRole?.toUpperCase();
      return await api.get("/api/tutorials/featured", { 
        params: normalizedRole ? { targetRole: normalizedRole } : undefined 
      });
    } catch (error) {
      console.error('Error fetching featured tutorials:', error);
      // Return empty result instead of throwing
      return {
        data: {
          tutorials: [],
        },
      };
    }
  },

  getTutorialBySlug: (slug: string) => api.get(`/api/tutorials/slug/${slug}`),

  // Admin endpoints
  getAllTutorials: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    targetRole?: string;
    isPublished?: boolean;
    search?: string;
  }) => api.get("/api/tutorials/admin/all", { params }),

  getTutorialStats: () => api.get("/api/tutorials/admin/stats"),

  getTutorialById: (id: string) => api.get(`/api/tutorials/admin/${id}`),

  createTutorial: (data: any) => api.post("/api/tutorials/admin", data),

  updateTutorial: (id: string, data: any) =>
    api.put(`/api/tutorials/admin/${id}`, data),

  deleteTutorial: (id: string) => api.delete(`/api/tutorials/admin/${id}`),
};
