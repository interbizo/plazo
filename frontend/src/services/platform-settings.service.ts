import api from "@/lib/api";

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface MaintenanceStatus {
  enabled: boolean;
  title: string;
  message: string;
  estimatedEnd: string | null;
}

export const platformSettingsService = {
  async getAll(): Promise<PlatformSetting[]> {
    const res = await api.get("/admin/platform-settings");
    return res.data;
  },

  async update(
    key: string,
    value: string,
    description?: string,
  ): Promise<PlatformSetting> {
    const res = await api.patch(
      `/admin/platform-settings/${encodeURIComponent(key)}`,
      { value, description },
    );
    return res.data;
  },

  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    const res = await api.get("/admin/platform-settings/maintenance");
    return res.data;
  },

  async getPublicFlags(): Promise<Record<string, string>> {
    try {
      const res = await api.get("/api/public/platform-settings");
      return res.data;
    } catch {
      return {
        "module.forum": "true",
        "module.article": "true",
        "module.jobs": "true",
        "module.referral": "false",
      };
    }
  },
};
