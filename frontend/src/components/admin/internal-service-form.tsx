"use client";

import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Image from "next/image";
import { ArrowLeft, Package, Plus, Trash2, Upload, X } from "lucide-react";
import { adminApi } from "@/services/admin.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { WordCounter, isOverWordLimit, MAX_WORDS } from "@/components/ui/word-counter";
import type { Category } from "@/types";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

interface FAQ {
  question: string;
  answer: string;
}

interface ServicePackageForm {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string[];
}

interface ServicePackageResponse {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  title?: string | null;
  description?: string | null;
  price?: number | null;
  deliveryDays?: number | null;
  revisions?: number | null;
  features?: string[] | null;
}

interface InternalServiceResponse {
  id?: string;
  name?: string | null;
  description?: string | null;
  basePrice?: number | null;
  comparePrice?: number | null;
  categoryId?: string | null;
  tags?: string[] | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isPublished?: boolean | null;
  publishToMarketplace?: boolean | null;
  gallery?: string[] | null;
  thumbnail?: string | null;
  faq?: FAQ[] | null;
  packages?: ServicePackageResponse[] | null;
}

interface InternalServiceFormProps {
  mode: "create" | "edit";
  serviceId?: string;
}

const PACKAGE_TIERS = [
  { value: "BASIC", label: "Basic", color: "bg-gray-100 text-gray-700" },
  { value: "STANDARD", label: "Standard", color: "bg-blue-100 text-blue-700" },
  { value: "PREMIUM", label: "Premium", color: "bg-purple-100 text-purple-700" },
] as const;

export function InternalServiceForm({
  mode,
  serviceId,
}: InternalServiceFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [packages, setPackages] = useState<ServicePackageForm[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    comparePrice: "",
    categoryId: "",
    subcategoryId: "",
    tags: "",
    metaKeywords: "",
    metaTitle: "",
    metaDescription: "",
    isPublished: true,
    publishToMarketplace: true,
  });

  // Auto-save draft for create mode (edit loads from API)
  const draftKey = "plazo_draft_admin-service-create";
  const draftRestored = useRef(false);

  useEffect(() => {
    if (isEdit || draftRestored.current) return;
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
  }, [isEdit]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isEdit || !draftRestored.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        const hasData = Object.values(form).some((v) => v !== "" && v !== null && v !== undefined && v !== false && v !== 0);
        if (hasData) localStorage.setItem(draftKey, JSON.stringify(form));
      } catch {}
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [form, isEdit]);

  const clearDraft = () => localStorage.removeItem(draftKey);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (
      typeof error === "object" &&
      error &&
      "response" in error &&
      typeof (error as { response?: unknown }).response === "object"
    ) {
      const response = (error as {
        response?: { data?: { message?: string | string[] } };
      }).response;
      const message = response?.data?.message;
      if (Array.isArray(message)) return message.join(", ");
      if (typeof message === "string") return message;
    }
    return fallback;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const catRes = await adminApi.getCategories({ type: "SERVICE" });
        const categoriesData = Array.isArray(catRes.data) ? catRes.data : catRes.data?.categories || [];
        setCategories(categoriesData);

        if (isEdit && serviceId) {
          const { data } = await adminApi.getInternalService(serviceId);
          const service: InternalServiceResponse = data?.service || data;
          if (!service?.id) {
            toast.error("Jasa internal tidak ditemukan");
            router.push("/admin/services");
            return;
          }

          // Determine if categoryId is a parent or subcategory
          const serviceCategory = categoriesData.find((cat: Category) => cat.id === service.categoryId);
          
          let mainCategoryId = service.categoryId || "";
          let subCategoryId = "";
          
          // If service category has a parent, it's a subcategory
          if (serviceCategory && serviceCategory.parentId) {
            mainCategoryId = serviceCategory.parentId;
            subCategoryId = service.categoryId || "";
          }

          setForm({
            name: service.name || "",
            description: service.description || "",
            basePrice: String(service.basePrice || ""),
            comparePrice: String(service.comparePrice || ""),
            categoryId: mainCategoryId,
            subcategoryId: subCategoryId,
            tags: Array.isArray(service.tags) ? service.tags.join(", ") : "",
            metaKeywords: (service as any).metaKeywords || "",
            metaTitle: service.metaTitle || "",
            metaDescription: service.metaDescription || "",
            isPublished: service.isPublished ?? true,
            publishToMarketplace: service.publishToMarketplace ?? true,
          });
          setExistingImages(() => {
            const images: string[] = [];
            if (service.thumbnail) images.push(service.thumbnail);
            if (Array.isArray(service.gallery)) {
              for (const img of service.gallery) {
                if (!images.includes(img)) images.push(img);
              }
            }
            return images;
          });
          setFaqs(
            Array.isArray(service.faq)
              ? (service.faq as FAQ[]).filter(
                  (item) => item && (item.question?.trim() || item.answer?.trim())
                )
              : []
          );
          setPackages(
            Array.isArray(service.packages)
              ? service.packages.map((pkg) => ({
                  tier: pkg.tier,
                  title: pkg.title || "",
                  description: pkg.description || "",
                  price: String(pkg.price || ""),
                  deliveryDays: String(pkg.deliveryDays || ""),
                  revisions: String(pkg.revisions || "1"),
                  features: Array.isArray(pkg.features) ? pkg.features : [],
                }))
              : [],
          );
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Gagal memuat form jasa internal"));
        if (isEdit) router.push("/admin/services");
      } finally {
        setIsLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isEdit, router, serviceId]);

  const handleNewImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const total = existingImages.length + newImageFiles.length + files.length;
    if (total > 10) {
      toast.error(`Maksimal 10 foto. Saat ini ada ${existingImages.length + newImageFiles.length} foto.`);
      return;
    }
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [
      ...prev,
      ...files.map((file) => URL.createObjectURL(file)),
    ]);
    e.target.value = "";
  };

  const addFaq = () => setFaqs((prev) => [...prev, { question: "", answer: "" }]);
  const removeFaq = (index: number) =>
    setFaqs((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  const updateFaq = (index: number, field: keyof FAQ, value: string) =>
    setFaqs((prev) =>
      prev.map((faq, currentIndex) =>
        currentIndex === index ? { ...faq, [field]: value } : faq,
      ),
    );

  const addPackage = (tier: "BASIC" | "STANDARD" | "PREMIUM") => {
    if (packages.some((pkg) => pkg.tier === tier)) {
      toast.error(`Paket ${tier} sudah ada`);
      return;
    }
    setPackages((prev) => [
      ...prev,
      {
        tier,
        title: "",
        description: "",
        price: "",
        deliveryDays: "",
        revisions: "1",
        features: [""],
      },
    ]);
  };

  const updatePackage = (
    index: number,
    field: keyof ServicePackageForm,
    value: string | string[],
  ) =>
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === index ? { ...pkg, [field]: value } : pkg,
      ),
    );

  const removePackage = (index: number) =>
    setPackages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));

  const addPackageFeature = (index: number) =>
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === index
          ? { ...pkg, features: [...pkg.features, ""] }
          : pkg,
      ),
    );

  const updatePackageFeature = (
    packageIndex: number,
    featureIndex: number,
    value: string,
  ) =>
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === packageIndex
          ? {
              ...pkg,
              features: pkg.features.map((feature, idx) =>
                idx === featureIndex ? value : feature,
              ),
            }
          : pkg,
      ),
    );

  const removePackageFeature = (packageIndex: number, featureIndex: number) =>
    setPackages((prev) =>
      prev.map((pkg, currentIndex) =>
        currentIndex === packageIndex
          ? {
              ...pkg,
              features: pkg.features.filter((_, idx) => idx !== featureIndex),
            }
          : pkg,
      ),
    );

  const uploadNewImages = async () => {
    if (newImageFiles.length === 0) return [];
    const formData = new FormData();
    newImageFiles.forEach((file) => formData.append("files", file));
    const response = await adminApi.uploadFiles(formData);
    const uploadedFiles = (response.data?.files || []) as Array<{ url: string }>;
    return uploadedFiles.map((file) => file.url);
  };

  const handleSubmit = async (e: FormEvent) => {
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

    setIsSubmitting(true);
    try {
      const uploadedUrls = await uploadNewImages();
      const allImages = [...existingImages, ...uploadedUrls];
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: Number(form.basePrice),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        categoryId: form.subcategoryId || form.categoryId, // Use subcategory if selected, otherwise use main category
        tags: form.tags
          ? form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
        metaKeywords: form.metaKeywords || undefined,
        isPublished: form.isPublished,
        publishToMarketplace: form.publishToMarketplace,
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
        thumbnail: allImages[0] || undefined,
        gallery: allImages,
        faq: faqs.filter((faq) => faq.question.trim() && faq.answer.trim()),
        packages: packages
          .filter(
            (pkg) =>
              pkg.title.trim() &&
              pkg.description.trim() &&
              Number(pkg.price) > 0 &&
              Number(pkg.deliveryDays) > 0,
          )
          .map((pkg) => ({
            tier: pkg.tier,
            title: pkg.title.trim(),
            description: pkg.description.trim(),
            price: Number(pkg.price),
            deliveryDays: Number(pkg.deliveryDays),
            revisions: Number(pkg.revisions) || 0,
            features: pkg.features.filter((feature) => feature.trim()),
          })),
      };

      if (isEdit && serviceId) {
        await adminApi.updateInternalService(serviceId, payload);
        toast.success("Jasa internal berhasil diperbarui");
      } else {
        await adminApi.createInternalService(payload);
        toast.success("Jasa internal berhasil dibuat");
      }

      clearDraft();
      router.push("/admin/services?tab=internal");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal menyimpan jasa internal"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const totalImages = existingImages.length + newImageFiles.length;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/services?tab=internal"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Jasa Internal
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Jasa Internal" : "Tambah Jasa Internal"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Layanan resmi platform untuk tampil konsisten di website utama.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Informasi Dasar</h2>

          <Input
            label="Nama Layanan *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            maxLength={200}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deskripsi *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <WordCounter text={form.description} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Harga Dasar (Rp) *"
              type="number"
              value={form.basePrice}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, basePrice: e.target.value }))
              }
              placeholder="179000"
            />
            <Input
              label="Harga Coret (Rp)"
              type="number"
              value={form.comparePrice}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, comparePrice: e.target.value }))
              }
              placeholder="249000"
              helperText="Harga sebelum diskon (opsional)"
            />
          </div>

          {form.comparePrice && Number(form.comparePrice) > Number(form.basePrice) && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-green-700">Preview Diskon:</span>
                <span className="text-lg font-bold text-green-600">
                  Rp {Number(form.basePrice).toLocaleString("id-ID")}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  Rp {Number(form.comparePrice).toLocaleString("id-ID")}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  -{Math.round(((Number(form.comparePrice) - Number(form.basePrice)) / Number(form.comparePrice)) * 100)}%
                </span>
              </div>
            </div>
          )}

          <div>
            <CategorySubcategorySelect
              categories={categories}
              selectedCategoryId={form.categoryId}
              selectedSubcategoryId={form.subcategoryId}
              onCategoryChange={(categoryId) => setForm((prev) => ({ ...prev, categoryId, subcategoryId: "" }))}
              onSubcategoryChange={(subcategoryId) => setForm((prev) => ({ ...prev, subcategoryId }))}
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
            onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
            placeholder="branding, desain, konsultasi"
          />

          <Input
            label="Keywords SEO"
            value={form.metaKeywords}
            onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
            placeholder="jasa desain, branding profesional, konsultasi bisnis"
            helperText="Kata kunci untuk membantu SEO (pisahkan dengan koma)"
          />

          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, isPublished: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Publish layanan
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.publishToMarketplace}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    publishToMarketplace: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              Tampilkan di marketplace utama
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Paket Layanan
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Atur paket Basic, Standard, dan Premium untuk jasa internal.
              </p>
            </div>
            <div className="flex gap-2">
              {PACKAGE_TIERS.map((tier) => (
                <Button
                  key={tier.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPackage(tier.value)}
                  disabled={packages.some((pkg) => pkg.tier === tier.value)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {tier.label}
                </Button>
              ))}
            </div>
          </div>

          {packages.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Belum ada paket. Tambahkan paket jika layanan membutuhkan tier.
            </div>
          ) : (
            <div className="space-y-4">
              {packages.map((pkg, packageIndex) => {
                const tierInfo = PACKAGE_TIERS.find((tier) => tier.value === pkg.tier);
                return (
                  <div
                    key={`${pkg.tier}-${packageIndex}`}
                    className="space-y-3 rounded-lg border-2 border-gray-200 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${tierInfo?.color}`}
                      >
                        {tierInfo?.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePackage(packageIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        label="Nama Paket"
                        value={pkg.title}
                        onChange={(e) =>
                          updatePackage(packageIndex, "title", e.target.value)
                        }
                      />
                      <Input
                        label="Harga (Rp)"
                        type="number"
                        value={pkg.price}
                        onChange={(e) =>
                          updatePackage(packageIndex, "price", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Deskripsi Paket
                      </label>
                      <textarea
                        value={pkg.description}
                        onChange={(e) =>
                          updatePackage(packageIndex, "description", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label="Waktu Pengerjaan (hari)"
                        type="number"
                        value={pkg.deliveryDays}
                        onChange={(e) =>
                          updatePackage(
                            packageIndex,
                            "deliveryDays",
                            e.target.value,
                          )
                        }
                      />
                      <Input
                        label="Jumlah Revisi"
                        type="number"
                        value={pkg.revisions}
                        onChange={(e) =>
                          updatePackage(packageIndex, "revisions", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">
                          Fitur Paket
                        </label>
                        <button
                          type="button"
                          onClick={() => addPackageFeature(packageIndex)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
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
                              onChange={(e) =>
                                updatePackageFeature(
                                  packageIndex,
                                  featureIndex,
                                  e.target.value,
                                )
                              }
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removePackageFeature(packageIndex, featureIndex)
                              }
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
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Foto Layanan</h2>
          {(existingImages.length > 0 || newImagePreviews.length > 0) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {existingImages.map((src, index) => (
                <div
                  key={`existing-${index}`}
                  className="relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 group"
                >
                  <Image src={src} alt={`Existing ${index + 1}`} fill className="object-cover" />
                  {index === 0 && (
                    <div className="absolute left-1 top-1 rounded bg-blue-500 px-2 py-0.5 text-xs text-white">
                      Utama
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setExistingImages((prev) =>
                        prev.filter((_, currentIndex) => currentIndex !== index),
                      )
                    }
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {newImagePreviews.map((src, index) => (
                <div
                  key={`new-${index}`}
                  className="relative aspect-square overflow-hidden rounded-lg border-2 border-green-200 group"
                >
                  <Image
                    src={src}
                    alt={`New ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute left-1 top-1 rounded bg-green-500 px-2 py-0.5 text-xs text-white">
                    Baru
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(newImagePreviews[index]);
                      setNewImageFiles((prev) =>
                        prev.filter((_, currentIndex) => currentIndex !== index),
                      );
                      setNewImagePreviews((prev) =>
                        prev.filter((_, currentIndex) => currentIndex !== index),
                      );
                    }}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalImages < 10 && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50">
              <Upload className="mb-2 h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Klik untuk upload foto baru
              </span>
              <span className="mt-1 text-xs text-gray-500">
                PNG, JPG hingga 5MB ({totalImages}/10)
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleNewImageSelect}
              />
            </label>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">FAQ</h2>
              <p className="text-xs text-gray-500 mt-1">
                Pertanyaan yang sering diajukan untuk jasa internal ini.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addFaq}>
              <Plus className="h-4 w-4 mr-1" />
              Tambah FAQ
            </Button>
          </div>

          {faqs.length > 0 && (
            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-lg border border-gray-200 p-4"
                >
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
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">SEO</h2>
          <Input
            label="Meta Title"
            value={form.metaTitle}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, metaTitle: e.target.value }))
            }
            maxLength={60}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Meta Description
            </label>
            <textarea
              value={form.metaDescription}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, metaDescription: e.target.value }))
              }
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSubmitting} size="lg">
            {isEdit ? "Simpan Perubahan" : "Buat Jasa Internal"}
          </Button>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              window.location.href = "/admin/services?tab=internal";
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
