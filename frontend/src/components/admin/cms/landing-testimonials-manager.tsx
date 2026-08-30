import { adminApi } from "@/services/admin.service";
import { LandingSectionManager, type LandingSectionConfig } from "./landing-section-manager";

const config: LandingSectionConfig = {
  title: "Testimoni", description: "Cerita singkat pemilik bisnis yang tampil di landing page.", singular: "testimoni",
  sectionDefaults: { eyebrow: "Testimoni", title: "Dibuat untuk bisnis yang ingin terlihat lebih siap.", description: "Cerita dari pemilik bisnis yang memakai toko sebagai titik awal percakapan dengan pelanggan." },
  get: adminApi.getLandingTestimonials, create: adminApi.createLandingTestimonial, update: adminApi.updateLandingTestimonial, remove: adminApi.deleteLandingTestimonial,
  createItem: (sortOrder) => ({ label: "Peran atau nama toko", title: "Nama pemberi testimoni", description: "", sortOrder, isPublished: true }), hasLabel: true, labelFieldLabel: "Peran / toko", titleFieldLabel: "Nama", descriptionFieldLabel: "Isi testimoni",
};
export function LandingTestimonialsManager() { return <LandingSectionManager config={config} />; }
