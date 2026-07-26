import api from "@/lib/api";

export interface Region {
  id: string;
  name: string;
}

export const regionApi = {
  getProvinces: () => api.get<Region[]>("/api/regions/provinces"),

  getCities: (provinceId: string) =>
    api.get<Region[]>(`/api/regions/provinces/${provinceId}/cities`),

  getDistricts: (cityId: string) =>
    api.get<Region[]>(`/api/regions/cities/${cityId}/districts`),
};

export const addressApi = {
  getMyAddresses: () => api.get("/api/addresses"),

  getDefaultAddress: () => api.get("/api/addresses/default"),

  createAddress: (data: {
    label: string;
    name: string;
    phone: string;
    address: string;
    province: string;
    provinceId?: string;
    city: string;
    cityId?: string;
    district: string;
    districtId?: string;
    postalCode: string;
    isDefault?: boolean;
  }) => api.post("/api/addresses", data),

  updateAddress: (id: string, data: any) => api.put(`/api/addresses/${id}`, data),

  deleteAddress: (id: string) => api.delete(`/api/addresses/${id}`),

  setDefault: (id: string) => api.post(`/api/addresses/${id}/set-default`),
};
