import { adminApi } from "@/services/admin.service";
import { LandingSectionManager, type LandingSectionConfig } from "./landing-section-manager";

const config: LandingSectionConfig = {
  title: "Cara kerja", description: "Urutan yang menjelaskan cara bisnis mulai menggunakan Plazo.", singular: "langkah",
  sectionDefaults: { eyebrow: "Cara kerja", title: "Beri bisnis Anda jalur yang jelas untuk bergerak.", description: "Buat toko, susun penawaran, lalu ubah minat menjadi percakapan yang relevan." },
  get: adminApi.getLandingSteps, create: adminApi.createLandingStep, update: adminApi.updateLandingStep, remove: adminApi.deleteLandingStep,
  createItem: (sortOrder) => ({ title: "Langkah baru", description: "", icon: "Store", sortOrder, isPublished: true }), hasIcon: true,
};
export function LandingStepsManager() { return <LandingSectionManager config={config} />; }
