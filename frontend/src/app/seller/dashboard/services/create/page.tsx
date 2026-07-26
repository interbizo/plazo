"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { uploadApi } from "@/services/upload.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { WordCounter, isOverWordLimit, MAX_WORDS } from "@/components/ui/word-counter";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Upload,
  X,
  Image as ImageIcon,
  Plus,
  Trash2,
  Package,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import type { Category } from "@/types";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

interface FAQ {
  question: string;
  answer: string;
}

interface ServicePackage {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string[];
}

const PACKAGE_TIERS = [
  { value: "BASIC", label: "Basic", color: "bg-gray-100 text-gray-700" },
  { value: "STANDARD", label: "Standard", color: "bg-blue-100 text-blue-700" },
  { value: "PREMIUM", label: "Premium", color: "bg-purple-100 text-purple-700" },
] as const;

export default function CreateServicePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    categoryId: "",
    subcategoryId: "",
    tags: "",
    metaKeywords: "",
    thumbnail: "",
    gallery: [] as string[],
    metaTitle: "",
    metaDescription: "",
    publishToMarketplace: true,
  });

  // Auto-save draft to localStorage
  const draftKey = "plazo_draft_seller-service-create";
  const draftRestored = useRef(false);
  const canSave = useRef(false);

  useEffect(() => {
    if (draftRestored.current) return;
    draftRestored.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Object.values(parsed).some((v: unknown) => v !== "" && v !== null && v !== undefined && v !== false)) {
          setForm((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch { localStorage.removeItem(draftKey); }
    setTimeout(() => { canSave.current = true; }, 3000);
  }, []);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!canSave.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const hasData = Object.values(form).some((v) => v !== "" && v !== null && v !== undefined && v !== false && v !== 0);
        if (hasData) localStorage.setItem(draftKey, JSON.stringify(form));
      } catch {}
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [form]);

  const clearDraft = () => localStorage.removeItem(draftKey);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    if (imageFiles.length + files.length > 10) {
      toast.error(`Maksimal 10 foto. Anda sudah punya ${imageFiles.length} foto.`);
      return;
    }
    
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqs];
    updated[index][field] = value;
    setFaqs(updated);
  };

  // Package management
  const addPackage = (tier: "BASIC" | "STANDARD" | "PREMIUM") => {
    if (packages.some(p => p.tier === tier)) {
      toast.error(`Paket ${tier} sudah ada`);
      return;
    }
    setPackages([...packages, {
      tier,
      title: "",
      description: "",
      price: "",
      deliveryDays: "",
      revisions: "1",
      features: [""],
    }]);
  };

  const removePackage = (index: number) => {
    setPackages(packages.filter((_, i) => i !== index));
  };

  const updatePackage = (index: number, field: keyof ServicePackage, value: any) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const addPackageFeature = (packageIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].features.push("");
    setPackages(updated);
  };

  const removePackageFeature = (packageIndex: number, featureIndex: number) => {
    const updated = [...packages];
    updated[packageIndex].features = updated[packageIndex].features.filter((_, i) => i !== featureIndex);
    setPackages(updated);
  };

  const updatePackageFeature = (packageIndex: number, featureIndex: number, value: string) => {
    const updated = [...packages];
    updated[packageIndex].features[featureIndex] = value;
    setPackages(updated);
  };

  useEffect(() => {
    sellerApi
      .getCategories("SERVICE")
      .then(({ data }) =>
        // Use allCategories (flat list) instead of categories (hierarchical)
        setCategories(Array.isArray(data) ? data : data?.allCategories || data?.categories || []),
      )
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.basePrice || !form.categoryId) {
      toast.error("Nama, harga dasar, dan kategori wajib diisi");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Deskripsi layanan wajib diisi");
      return;
    }
    if (isOverWordLimit(form.description)) {
      toast.error(`Deskripsi melebihi batas ${MAX_WORDS} kata. Silakan kurangi.`);
      return;
    }
    if (Number(form.basePrice) <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }
    
    setIsSubmitting(true);
    try {
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        const { data } = await uploadApi.uploadMultiple(imageFiles);
        // Backend returns { files: [...] } not { urls: [...] }
        uploadedUrls = data.files.map(f => f.url);
      }
      
      const serviceData: any = {
        name: form.name,
        description: form.description,
        basePrice: Number(form.basePrice),
        categoryId: form.subcategoryId || form.categoryId, // Use subcategory if selected, otherwise use main category
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
        metaKeywords: form.metaKeywords,
        publishToMarketplace: true, // Always publish to marketplace
      };
      
      if (uploadedUrls.length > 0) {
        serviceData.thumbnail = uploadedUrls[0];
        serviceData.gallery = uploadedUrls;
      }
      
      if (faqs.length > 0) {
        const validFaqs = faqs.filter(f => f.question.trim() && f.answer.trim());
        if (validFaqs.length > 0) {
          serviceData.faq = validFaqs;
        }
      }
      
      if (form.metaTitle.trim()) {
        serviceData.metaTitle = form.metaTitle;
      }
      if (form.metaDescription.trim()) {
        serviceData.metaDescription = form.metaDescription;
      }
      
      const { data: createdService } = await sellerApi.createService(serviceData);
      const serviceId = createdService.data?.id;
      
      // Create packages if any
      if (packages.length > 0 && serviceId) {
        const validPackages = packages.filter(p => 
          p.title.trim() && 
          p.description.trim() && 
          Number(p.price) > 0 && 
          Number(p.deliveryDays) > 0
        ).map(p => ({
          tier: p.tier,
          title: p.title,
          description: p.description,
          price: Number(p.price),
          deliveryDays: Number(p.deliveryDays),
          revisions: Number(p.revisions) || 1,
          features: p.features.filter(f => f.trim()),
        }));
        
        if (validPackages.length > 0) {
          try {
            await sellerApi.createServicePackagesBulk(serviceId, validPackages);
          } catch (err) {
            console.error("Failed to create packages:", err);
            toast.error("Layanan dibuat tapi gagal membuat paket");
          }
        }
      }
      
      toast.success("Layanan berhasil dibuat!");
      clearDraft();
      router.push("/seller/dashboard/services");
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } } };
      toast.error(errObj?.response?.data?.message || "Gagal membuat layanan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/seller/dashboard/services"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Tambah Layanan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Buat layanan baru untuk ditawarkan kepada pelanggan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl">
        {/* Basic Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Informasi Dasar
          </h2>

          <Input
            label="Nama Layanan *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Desain Logo Profesional"
            maxLength={200}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deskripsi *
            </label>
            <CKEditor4
              value={form.description}
              onChange={(value) =>
                setForm({ ...form, description: value })
              }
              placeholder="Jelaskan layanan Anda secara detail dengan format yang menarik..."
              minHeight="400px"
            />
            <WordCounter text={form.description} />
            <p className="mt-1 text-xs text-gray-500">
              Gunakan editor untuk memformat teks dengan bold, list, heading, dll.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Harga Dasar (Rp) *"
              type="number"
              value={form.basePrice}
              onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              placeholder="0"
              min="0"
              helperText="Harga dasar untuk layanan ini"
            />
          </div>

          <div>
            <CategorySubcategorySelect
              categories={categories}
              selectedCategoryId={form.categoryId}
              selectedSubcategoryId={form.subcategoryId}
              onCategoryChange={(categoryId) => setForm({ ...form, categoryId })}
              onSubcategoryChange={(subcategoryId) => setForm({ ...form, subcategoryId })}
              required
              categoryLabel="Kategori"
              subcategoryLabel="Sub Kategori"
              categoryPlaceholder="Pilih kategori"
              subcategoryPlaceholder="Pilih sub kategori"
            />
          </div>

          <Input
            label="Tags"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            placeholder="logo, desain, branding (pisahkan dengan koma)"
            helperText="Tags membantu pelanggan menemukan layanan Anda"
          />

          <Input
            label="Keywords SEO"
            value={form.metaKeywords}
            onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
            placeholder="jasa desain logo, branding profesional, desain grafis"
            helperText="Kata kunci untuk membantu SEO (pisahkan dengan koma)"
          />
        </div>

        {/* Service Packages */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Paket Layanan (Opsional)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Tawarkan berbagai pilihan paket dengan harga dan fitur berbeda
              </p>
            </div>
            <div className="flex gap-2">
              {PACKAGE_TIERS.map(tier => (
                <Button
                  key={tier.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPackage(tier.value as any)}
                  disabled={packages.some(p => p.tier === tier.value)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tier.label}
                </Button>
              ))}
            </div>
          </div>

          {packages.length > 0 && (
            <div className="space-y-4">
              {packages.map((pkg, pkgIndex) => {
                const tierInfo = PACKAGE_TIERS.find(t => t.value === pkg.tier);
                return (
                  <div key={pkgIndex} className="border-2 border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${tierInfo?.color}`}>
                        {tierInfo?.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePackage(pkgIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Nama Paket"
                        value={pkg.title}
                        onChange={(e) => updatePackage(pkgIndex, "title", e.target.value)}
                        placeholder={`Contoh: ${tierInfo?.label} Logo Design`}
                      />
                      <Input
                        label="Harga (Rp)"
                        type="number"
                        value={pkg.price}
                        onChange={(e) => updatePackage(pkgIndex, "price", e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Deskripsi Paket
                      </label>
                      <textarea
                        value={pkg.description}
                        onChange={(e) => updatePackage(pkgIndex, "description", e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Jelaskan apa yang termasuk dalam paket ini..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Waktu Pengerjaan (hari)"
                        type="number"
                        value={pkg.deliveryDays}
                        onChange={(e) => updatePackage(pkgIndex, "deliveryDays", e.target.value)}
                        placeholder="0"
                        min="1"
                      />
                      <Input
                        label="Jumlah Revisi"
                        type="number"
                        value={pkg.revisions}
                        onChange={(e) => updatePackage(pkgIndex, "revisions", e.target.value)}
                        placeholder="1"
                        min="0"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-700">
                          Fitur Paket
                        </label>
                        <button
                          type="button"
                          onClick={() => addPackageFeature(pkgIndex)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Tambah Fitur
                        </button>
                      </div>
                      <div className="space-y-2">
                        {pkg.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => updatePackageFeature(pkgIndex, featureIndex, e.target.value)}
                              placeholder="Contoh: Source File Included"
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() => removePackageFeature(pkgIndex, featureIndex)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {packages.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Belum ada paket. Klik tombol di atas untuk menambah paket.
            </div>
          )}
        </div>

        {/* Gallery Images */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Foto Layanan
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Upload foto yang menampilkan hasil kerja atau portfolio Anda (maksimal 10 foto)
            </p>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                  <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                      Utama
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {imageFiles.length < 10 && (
            <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                Klik untuk upload foto
              </span>
              <span className="text-xs text-gray-500 mt-1">
                PNG, JPG hingga 5MB ({imageFiles.length}/10)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
          )}
        </div>

        {/* FAQ Section */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                FAQ (Opsional)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Jawab pertanyaan yang sering ditanyakan pelanggan
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addFaq}
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah FAQ
            </Button>
          </div>

          {faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      FAQ #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFaq(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    label="Pertanyaan"
                    value={faq.question}
                    onChange={(e) => updateFaq(index, "question", e.target.value)}
                    placeholder="Contoh: Berapa lama waktu pengerjaan?"
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Jawaban
                    </label>
                    <textarea
                      value={faq.answer}
                      onChange={(e) => updateFaq(index, "answer", e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="Jawaban untuk pertanyaan di atas..."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SEO Settings */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              SEO (Opsional)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Optimasi untuk mesin pencari
            </p>
          </div>

          <Input
            label="Meta Title"
            value={form.metaTitle}
            onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
            placeholder="Judul untuk mesin pencari (kosongkan untuk otomatis)"
            maxLength={60}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Meta Description
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) =>
                setForm({ ...form, metaDescription: e.target.value })
              }
              rows={3}
              maxLength={160}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Deskripsi singkat untuk mesin pencari (kosongkan untuk otomatis)"
            />
            <p className="mt-1 text-xs text-gray-500">
              {form.metaDescription.length}/160 karakter
            </p>
          </div>
        </div>

        {/* Marketplace Publishing */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Visibilitas Marketplace
          </h2>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="publishToMarketplace"
              checked={true}
              disabled={true}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-60 cursor-not-allowed"
            />
            <div className="flex-1">
              <label
                htmlFor="publishToMarketplace"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Publish ke Marketplace Utama
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Layanan akan tampil di halaman utama marketplace dan bisa ditemukan semua user
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSubmitting} size="lg">
            Simpan Layanan
          </Button>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              window.location.href = "/seller/dashboard/services";
            }}
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
