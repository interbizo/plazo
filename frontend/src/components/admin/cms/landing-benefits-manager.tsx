import { adminApi } from "@/services/admin.service";
import { LandingSectionManager, type LandingSectionConfig } from "./landing-section-manager";

const config: LandingSectionConfig = {
  title: "Benefit", description: "Kartu manfaat yang tampil di landing page.", singular: "benefit",
  sectionDefaults: { eyebrow: "Satu fondasi kerja", title: "Bukan sekadar halaman. Ini tempat bisnis Anda mulai terlihat utuh.", description: "Setiap bagian membantu pelanggan memahami bisnis Anda sebelum percakapan dimulai." },
  get: adminApi.getLandingBenefits, create: adminApi.createLandingBenefit, update: adminApi.updateLandingBenefit, remove: adminApi.deleteLandingBenefit,
  createItem: (sortOrder) => ({ label: "Benefit baru", title: "Judul benefit", description: "", icon: "Sparkles", sortOrder, isPublished: true }), hasLabel: true, hasIcon: true,
};
export function LandingBenefitsManager() { return <LandingSectionManager config={config} />; }
