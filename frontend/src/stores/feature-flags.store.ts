import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformSettingsService } from "@/services/platform-settings.service";

interface FeatureFlagsState {
  flags: Record<string, string>;
  isLoaded: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  fetchFlags: () => Promise<Record<string, string>>;
  isFeatureEnabled: (flagKey: string) => boolean;
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(
  persist(
    (set, get) => ({
      flags: {},
      isLoaded: false,
      _hasHydrated: false,

      setHasHydrated: (v: boolean) => set({ _hasHydrated: v }),

      fetchFlags: async () => {
        try {
          const flags = await platformSettingsService.getPublicFlags();
          set({ flags, isLoaded: true });
          return flags;
        } catch {
          set({ isLoaded: true });
          return get().flags;
        }
      },

      isFeatureEnabled: (flagKey: string) => {
        const { flags } = get();
        return flags[flagKey] !== "false";
      },
    }),
    {
      name: "plazo-feature-flags",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ flags: state.flags }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
