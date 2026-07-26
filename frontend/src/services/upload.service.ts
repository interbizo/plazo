import api from "@/lib/api";

export const uploadApi = {
  uploadFile: (fileOrFormData: File | FormData, category?: string) => {
    const formData = fileOrFormData instanceof FormData 
      ? fileOrFormData 
      : (() => {
          const fd = new FormData();
          fd.append("file", fileOrFormData);
          return fd;
        })();
    
    // Build URL with category as query parameter
    const url = category ? `/api/upload?category=${encodeURIComponent(category)}` : "/api/upload";
    
    // Don't set Content-Type header explicitly - let axios set it automatically with boundary
    // This ensures Authorization and x-tenant-subdomain headers from interceptor are preserved
    return api.post<{
      message: string;
      file: {
        id: string;
        url: string;
        originalName: string;
        mimeType: string;
        size: number;
        category: string;
      };
    }>(url, formData);
  },

  uploadMultiple: (files: File[], category?: string) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    
    // Build URL with category as query parameter
    const url = category ? `/api/upload/multiple?category=${encodeURIComponent(category)}` : "/api/upload/multiple";
    
    // Don't set Content-Type header explicitly - let axios set it automatically with boundary
    // This ensures Authorization and x-tenant-subdomain headers from interceptor are preserved
    return api.post<{ 
      message: string;
      files: Array<{
        id: string;
        url: string;
        originalName: string;
        mimeType: string;
        size: number;
        category: string;
      }>;
    }>(url, formData);
  },
};
