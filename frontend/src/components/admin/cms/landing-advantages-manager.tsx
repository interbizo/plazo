import { adminApi } from "@/services/admin.service";
import { LandingSectionManager, type LandingSectionConfig } from "./landing-section-manager";

const config: LandingSectionConfig = {
  title: "Keunggulan", description: "Alasan utama mengapa bisnis memilih Plazo.", singular: "keunggulan",
  sectionDefaults: { eyebrow: "Keunggulan Plazo", title: "Toko yang siap membantu bisnis terlihat serius.", description: "Ruang yang sederhana untuk mulai, tanpa memaksa bisnis Anda terlihat sama dengan yang lain." },
  get: adminApi.getLandingAdvantages, create: adminApi.createLandingAdvantage, update: adminApi.updateLandingAdvantage, remove: adminApi.deleteLandingAdvantage,
  createItem: (sortOrder) => ({ title: "Keunggulan baru", description: "", sortOrder, isPublished: true }),
};
export function LandingAdvantagesManager() { return <LandingSectionManager config={config} />; }
