"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { uploadApi } from "@/services/upload.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
import type { Service, Category } from "@/types";
import Image from "next/image";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

interface FAQ {
  question: string;
  answer: string;
}

interface ServicePackage {
  id?: string;
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

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [existingPackages, setExistingPackages] = useState<ServicePackage[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    categoryId: "",
    subcategoryId: "",
    tags: "",
    metaKeywords: "",
    metaTitle: "",
    metaDescription: "",
    publishToMarketplace: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [svcRes, catRes] = await Promise.all([
          sellerApi.getService(serviceId),
          sellerApi.getCategories("SERVICE"),
        ]);
        
        // Use allCategories (flat list) instead of categories (hierarchical)
        const allCats = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.allCategories || catRes.data?.categories || [];
        
        setCategories(allCats);
        
        // Backend returns { data: service }
        const svc = svcRes.data?.data || svcRes.data;
        
        if (svc && svc.id) {
          // Determine if categoryId is a parent or subcategory
          const serviceCategory = allCats.find((cat: Category) => cat.id === svc.categoryId);
          
          let mainCategoryId = svc.categoryId;
          let subCategoryId = "";
          
          // If service category has a parent, it's a subcategory
          if (serviceCategory && serviceCategory.parentId) {
            mainCategoryId = serviceCategory.parentId;
            subCategoryId = svc.categoryId;
          }
          
          setForm({
            name: svc.name || "",
            description: svc.description || "",
            basePrice: String(svc.basePrice || ""),
            categoryId: mainCategoryId,
            subcategoryId: subCategoryId,
            tags: Array.isArray(svc.tags) ? svc.tags.join(", ") : "",
            metaKeywords: (svc as any).metaKeywords || "",
            metaTitle: svc.metaTitle || "",
            metaDescription: svc.metaDescription || "",
            publishToMarketplace: svc.publishToMarketplace ?? false,
          });
          
          // Load existing images (deduplicate thumbnail from gallery)
          const images: string[] = [];
          if (svc.thumbnail) images.push(svc.thumbnail);
          if (svc.gallery && Array.isArray(svc.gallery)) {
            for (const img of svc.gallery) {
              if (!images.includes(img)) images.push(img);
            }
          }
          setExistingImages(images);
          
          // Load FAQ (filter out empty items from corrupted data)
          if (svc.faq && Array.isArray(svc.faq)) {
            const validFaqs = svc.faq.filter(
              (item: any) => item && (item.question?.trim() || item.answer?.trim())
            );
            setFaqs(validFaqs);
          }
          
          // Load existing packages
          try {
            const pkgRes = await sellerApi.getServicePackages(serviceId);
            if (pkgRes.data && Array.isArray(pkgRes.data)) {
              const loadedPackages = pkgRes.data.map((pkg: any) => ({
                id: pkg.id,
                tier: pkg.tier,
                title: pkg.title || "",
                description: pkg.description || "",
                price: String(pkg.price || ""),
                deliveryDays: String(pkg.deliveryDays || ""),
                revisions: String(pkg.revisions || "1"),
                features: Array.isArray(pkg.features) ? pkg.features : [],
              }));
              setExistingPackages(loadedPackages);
              setPackages(loadedPackages);
            }
          } catch (err) {
            console.error("Failed to load packages:", err);
          }
        } else {
          toast.error("Data layanan tidak ditemukan");
          router.push("/seller/dashboard/services");
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        console.error("Error loading service:", err);
        toast.error(err?.response?.data?.message || err?.message || "Gagal memuat data layanan");
        router.push("/seller/dashboard/services");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [serviceId, router]);

  const handleNewImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    const totalImages = existingImages.length + imageFiles.length + files.length;
    if (totalImages > 10) {
      toast.error(`Maksimal 10 foto. Anda sudah punya ${existingImages.length + imageFiles.length} foto.`);
      return;
    }
    
    setImageFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
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
      // Upload new images if any
      let newUploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        try {
          const { data } = await uploadApi.uploadMultiple(imageFiles);
          // Backend returns { files: [...] } not { urls: [...] }
          newUploadedUrls = data.files.map(f => f.url);
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
          toast.error("Gagal upload foto. Silakan coba lagi.");
          setIsSubmitting(false);
          return;
        }
      }
      
      // Combine existing and new images
      const allImages = [...existingImages, ...newUploadedUrls];
      
      // Prepare update data
      const updateData: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: Number(form.basePrice),
        categoryId: form.subcategoryId || form.categoryId, // Use subcategory if selected, otherwise use main category
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(t => t) : [],
        metaKeywords: form.metaKeywords,
        publishToMarketplace: true, // Always publish to marketplace
        metaTitle: form.metaTitle.trim() || undefined,
        metaDescription: form.metaDescription.trim() || undefined,
      };
      
      // Set thumbnail and gallery
      if (allImages.length > 0) {
        updateData.thumbnail = allImages[0];
        updateData.gallery = allImages;
      }
      
      // Add FAQ if any
      if (faqs.length > 0) {
        const validFaqs = faqs.filter(f => f.question.trim() && f.answer.trim());
        updateData.faq = validFaqs.length > 0 ? validFaqs : [];
      } else {
        updateData.faq = [];
      }
      
      console.log("Updating service with data:", updateData);
      
      // Update service
      try {
        await sellerApi.updateService(serviceId, updateData);
      } catch (updateErr: any) {
        console.error("Service update error:", updateErr);
        const errorMessage = updateErr?.response?.data?.message || 
                           updateErr?.message || 
                           "Gagal memperbarui layanan";
        toast.error(errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      // Handle packages
      const existingPackageIds = existingPackages.map(p => p.id).filter(Boolean);
      const currentPackageIds = packages.map(p => p.id).filter(Boolean);
      
      // Delete removed packages
      const packagesToDelete = existingPackageIds.filter(id => !currentPackageIds.includes(id));
      for (const pkgId of packagesToDelete) {
        try {
          await sellerApi.deleteServicePackage(serviceId, pkgId as string);
        } catch (err) {
          console.error("Failed to delete package:", err);
          // Don't stop the process for package deletion errors
        }
      }
      
      // Update or create packages
      let packageErrors = 0;
      for (const pkg of packages) {
        if (!pkg.title.trim() || !pkg.description.trim() || Number(pkg.price) <= 0 || Number(pkg.deliveryDays) <= 0) {
          continue;
        }
        
        const packageData: Record<string, unknown> = {
          title: pkg.title.trim(),
          description: pkg.description.trim(),
          price: Number(pkg.price),
          deliveryDays: Number(pkg.deliveryDays),
          revisions: Number(pkg.revisions) || 1,
          features: pkg.features.filter(f => f.trim()),
        };
        
        try {
          if (pkg.id) {
            // Update existing package (don't send tier — it can't change)
            await sellerApi.updateServicePackage(serviceId, pkg.id, packageData);
          } else {
            // Create new package (include tier)
            await sellerApi.createServicePackage(serviceId, { ...packageData, tier: pkg.tier });
          }
        } catch (err) {
          console.error("Failed to save package:", err);
          packageErrors++;
        }
      }
      
      if (packageErrors > 0) {
        toast.success(`Layanan berhasil diperbarui! (${packageErrors} paket gagal disimpan)`);
      } else {
        toast.success("Layanan berhasil diperbarui!");
      }
      
      router.push("/seller/dashboard/services");
    } catch (err: unknown) {
      console.error("Unexpected error:", err);
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = errObj?.response?.data?.message || 
                          errObj?.message || 
                          "Gagal memperbarui layanan";
      toast.error(errorMessage);
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

  const totalImages = existingImages.length + imageFiles.length;

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
        <h1 className="text-xl font-bold text-gray-900">Edit Layanan</h1>
        <p className="text-sm text-gray-500 mt-1">
          Perbarui informasi layanan Anda
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

          {(existingImages.length > 0 || imagePreviews.length > 0) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {/* Existing images */}
              {existingImages.map((src, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 group">
                  <Image src={src} alt={`Existing ${i + 1}`} fill className="object-cover" />
                  {i === 0 && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                      Utama
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {/* New images */}
              {imagePreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-200 group">
                  <img src={src} alt={`New ${i + 1}`} className="h-full w-full object-cover" />
                  <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                    Baru
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute top-1 right-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {totalImages < 10 && (
            <label className="flex flex-col items-center justify-center cursor-pointer rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                Klik untuk upload foto baru
              </span>
              <span className="text-xs text-gray-500 mt-1">
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
            Simpan Perubahan
          </Button>
          <Link
            href="/seller/dashboard/services"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
