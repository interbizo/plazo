import { create } from "zustand";
import { platformSettingsService } from "@/services/platform-settings.service";

interface MaintenanceState {
  enabled: boolean;
  title: string;
  message: string;
  estimatedEnd: string | null;
  /** Refresh status + detail dari endpoint flags publik. */
  checkMaintenance: () => Promise<void>;
  /** Terapkan status maintenance secara langsung (contoh: dari body response 503). */
  applyMaintenance: (detail?: {
    title?: string;
    message?: string;
    estimatedEnd?: string | null;
  }) => void;
}

const DEFAULT_MESSAGE =
  "Kami sedang melakukan pemeliharaan sistem untuk meningkatkan kualitas layanan Anda. Mohon maaf atas ketidaknyamanannya dan terima kasih atas kesabaran Anda.";

export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  enabled: false,
  title: "Sedang Dalam Perbaikan",
  message: DEFAULT_MESSAGE,
  estimatedEnd: null,

  checkMaintenance: async () => {
    try {
      const flags = await platformSettingsService.getPublicFlags();
      set({
        enabled: flags["maintenance.enabled"] === "true",
        title: flags["maintenance.title"] || "Sedang Dalam Perbaikan",
        message: flags["maintenance.message"] || DEFAULT_MESSAGE,
        estimatedEnd: flags["maintenance.estimated_end"] || null,
      });
    } catch {
      // Fail-open: jika endpoint flags tidak terjangkau, pertahankan status saat ini.
    }
  },

  applyMaintenance: (detail) =>
    set({
      enabled: true,
      title: detail?.title || "Sedang Dalam Perbaikan",
      message: detail?.message || DEFAULT_MESSAGE,
      estimatedEnd: detail?.estimatedEnd || null,
    }),
}));
