"use client";

import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, X } from "lucide-react";
import { adminApi } from "@/services/admin.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { WordCounter, isOverWordLimit, MAX_WORDS } from "@/components/ui/word-counter";
import ProductTypeForm, {
  type ProductType,
  type DigitalProductData,
  type DigitalDeliveryMethod,
} from "@/components/seller/ProductTypeForm";
import ProductVariantsForm, {
  type ProductVariant,
} from "@/components/seller/ProductVariantsForm";
import type { Category, Product } from "@/types";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

interface InternalProductFormProps {
  mode: "create" | "edit";
  productId?: string;
}

export function InternalProductForm({
  mode,
  productId,
}: InternalProductFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

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

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDigitalFile, setIsUploadingDigitalFile] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState("");
  const [productType, setProductType] = useState<ProductType>("PHYSICAL");
  const [digitalData, setDigitalData] = useState<DigitalProductData>({});
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    comparePrice: "",
    stock: "",
    categoryId: "",
    subcategoryId: "",
    tags: "",
    metaKeywords: "",
    isPublished: true,
    publishToMarketplace: true,
  });

  // Auto-save draft for create mode only (edit loads from API)
  const draftKey = "plazo_draft_admin-product-create";
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

  useEffect(() => {
    const load = async () => {
      try {
        const catRes = await adminApi.getCategories({ type: "PRODUCT" });
        const categoriesData = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.categories || [];
        setCategories(categoriesData);

        if (isEdit && productId) {
          const { data } = await adminApi.getInternalProduct(productId);
          const product: Product = data?.product || data;

          if (!product?.id) {
            toast.error("Produk internal tidak ditemukan");
            router.push("/admin/products");
            return;
          }

          // Determine if categoryId is a parent or subcategory
          const productCategory = categoriesData.find((cat: Category) => cat.id === product.categoryId);
          
          let mainCategoryId = product.categoryId;
          let subCategoryId = "";
          
          // If product category has a parent, it's a subcategory
          if (productCategory && productCategory.parentId) {
            mainCategoryId = productCategory.parentId;
            subCategoryId = product.categoryId;
          }

          setForm({
            name: product.name || "",
            description: product.description || "",
            price: product.price != null ? String(product.price) : "",
            comparePrice: product.comparePrice != null ? String(product.comparePrice) : "",
            stock: String(product.stock || ""),
            categoryId: mainCategoryId,
            subcategoryId: subCategoryId,
            tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
            metaKeywords: (product as any).metaKeywords || "",
            isPublished: product.isPublished ?? true,
            publishToMarketplace: product.publishToMarketplace ?? true,
          });
          setProductType(product.productType || "PHYSICAL");
          setImages(Array.isArray(product.images) ? product.images : []);
          setThumbnail(product.thumbnail || product.images?.[0] || "");
          setHasVariants(!!product.hasVariants);
          setVariants(
            Array.isArray(product.variants)
              ? product.variants.map((variant, index) => ({
                  id: variant.id,
                  name: variant.name || "",
                  sku: variant.sku || "",
                  price: variant.price ?? undefined,
                  stock: variant.stock || 0,
                  isActive: variant.isActive ?? true,
                  sortOrder: variant.sortOrder ?? index,
                  options: Array.isArray(variant.options)
                    ? variant.options.map((opt) => ({
                        optionName: opt.optionName || opt.name || "",
                        optionValue: opt.optionValue || opt.value || "",
                      }))
                    : [],
                }))
              : [],
          );

          const digitalProduct = product as Product & {
            digitalFileUrl?: string;
            digitalFileSize?: number;
            digitalFileName?: string;
            downloadLimit?: number;
            downloadExpiry?: number;
            externalLink?: string;
            accessInstructions?: string;
            licenseKey?: string;
            digitalDeliveryMethod?: DigitalDeliveryMethod;
          };

          if (product.productType === "DIGITAL" || product.isDigital) {
            setDigitalData({
              digitalFileUrl: digitalProduct.digitalFileUrl,
              digitalFileSize: digitalProduct.digitalFileSize,
              digitalFileName: digitalProduct.digitalFileName,
              downloadLimit: digitalProduct.downloadLimit,
              downloadExpiry: digitalProduct.downloadExpiry,
              externalLink: digitalProduct.externalLink,
              accessInstructions: digitalProduct.accessInstructions,
              licenseKey: digitalProduct.licenseKey,
              digitalDeliveryMethod: digitalProduct.digitalDeliveryMethod,
            });
          }
        }
      } catch (error: unknown) {
        toast.error(getErrorMessage(error, "Gagal memuat form produk internal"));
        if (isEdit) {
          router.push("/admin/products");
        }
      } finally {
        setIsLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isEdit, productId, router]);

  const handleFileSelect = async (
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} bukan file gambar`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} terlalu besar (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    if (images.length + validFiles.length > 10) {
      toast.error(`Maksimal 10 gambar. Saat ini ada ${images.length} gambar.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach((file) => formData.append("files", file));
      const response = await adminApi.uploadFiles(formData);
      const uploadedFiles = (response.data?.files || []) as Array<{ url: string }>;
      const uploadedUrls = uploadedFiles.map((file) => file.url);
      setImages((prev) => [...prev, ...uploadedUrls]);
      if (!thumbnail && uploadedUrls.length > 0) {
        setThumbnail(uploadedUrls[0]);
      }
      toast.success(`${uploadedUrls.length} gambar berhasil diupload`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal upload gambar"));
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDigitalFileUpload = async (file: File) => {
    setIsUploadingDigitalFile(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const response = await adminApi.uploadFiles(formData);
      const uploadedFile =
        (response.data?.file as
          | { url: string; size: number; originalName?: string }
          | undefined) ||
        (response.data?.files?.[0] as
          | { url: string; size: number; originalName?: string }
          | undefined);
      if (!uploadedFile) {
        throw new Error("File digital gagal diupload");
      }
      toast.success("File digital berhasil diupload");
      return {
        url: uploadedFile.url,
        size: uploadedFile.size,
        name: uploadedFile.originalName || file.name,
      };
    } finally {
      setIsUploadingDigitalFile(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const removedImage = images[index];
    const nextImages = images.filter((_, currentIndex) => currentIndex !== index);
    setImages(nextImages);
    if (removedImage === thumbnail) {
      setThumbnail(nextImages[0] || "");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.price || !form.categoryId) {
      toast.error("Nama, harga, dan kategori wajib diisi");
      return;
    }

    if (productType === "PHYSICAL" && !hasVariants && !form.stock) {
      toast.error("Stok wajib diisi untuk produk fisik");
      return;
    }

    if (isOverWordLimit(form.description)) {
      toast.error(`Deskripsi melebihi batas ${MAX_WORDS} kata. Silakan kurangi.`);
      return;
    }

    if (
      productType === "DIGITAL" &&
      digitalData.digitalDeliveryMethod === "FILE_DOWNLOAD" &&
      !digitalData.digitalFileUrl
    ) {
      toast.error("Upload file digital terlebih dahulu");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        categoryId: form.subcategoryId || form.categoryId, // Use subcategory if selected, otherwise use main category
        tags: form.tags
          ? form.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
        metaKeywords: form.metaKeywords || undefined,
        isPublished: form.isPublished,
        publishToMarketplace: form.publishToMarketplace,
        productType,
        isDigital: productType === "DIGITAL",
        stock:
          productType === "DIGITAL"
            ? 999999
            : hasVariants
              ? 0
              : Number(form.stock) || 0,
      };

      if (images.length > 0) {
        payload.images = images;
        payload.thumbnail = thumbnail || images[0];
      }

      if (productType === "DIGITAL") {
        payload.digitalFileUrl = digitalData.digitalFileUrl;
        payload.digitalFileSize = digitalData.digitalFileSize;
        payload.digitalFileName = digitalData.digitalFileName;
        payload.downloadLimit = digitalData.downloadLimit;
        payload.downloadExpiry = digitalData.downloadExpiry;
        payload.externalLink = digitalData.externalLink;
        payload.accessInstructions = digitalData.accessInstructions;
        payload.licenseKey = digitalData.licenseKey;
        payload.digitalDeliveryMethod = digitalData.digitalDeliveryMethod;
      }

      if (hasVariants && variants.length > 0) {
        payload.hasVariants = true;
        payload.variants = variants.map((variant) => ({
          name: variant.name,
          price: variant.price || Number(form.price),
          stock: variant.stock,
          sku: variant.sku || undefined,
          options: variant.options.map((option) => ({
            name: option.optionName,
            value: option.optionValue,
          })),
        }));
      } else {
        payload.hasVariants = false;
      }

      if (isEdit && productId) {
        await adminApi.updateInternalProduct(productId, payload);
        toast.success("Produk internal berhasil diperbarui");
      } else {
        await adminApi.createInternalProduct(payload);
        toast.success("Produk internal berhasil dibuat");
      }

      clearDraft();
      router.push("/admin/products?tab=internal");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Gagal menyimpan produk internal"));
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

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/products?tab=internal"
          className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Produk Internal
        </Link>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? "Edit Produk Internal" : "Tambah Produk Internal"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Produk ini akan dikelola oleh super admin dan bisa tampil di website utama.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
        <ProductTypeForm
          productType={productType}
          onProductTypeChange={setProductType}
          digitalData={digitalData}
          onDigitalDataChange={(data) =>
            setDigitalData((prev) => ({ ...prev, ...data }))
          }
          onFileUpload={handleDigitalFileUpload}
          isUploading={isUploadingDigitalFile}
        />

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Foto Produk</h2>
          <p className="text-xs text-gray-500">
            Upload maksimal 10 gambar. Gambar pertama atau yang Anda pilih bisa menjadi thumbnail.
          </p>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <div key={`${image}-${index}`} className="relative group">
                  <div className="aspect-square overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                    <Image
                      src={image}
                      alt={`Produk ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  {thumbnail === image && (
                    <div className="absolute left-2 top-2 rounded bg-blue-600 px-2 py-1 text-xs text-white">
                      Thumbnail
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    {thumbnail !== image && (
                      <button
                        type="button"
                        onClick={() => setThumbnail(image)}
                        className="rounded bg-white px-3 py-1 text-xs font-medium text-gray-700"
                      >
                        Set Thumbnail
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="rounded-full bg-red-600 p-2 text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {images.length < 10 && (
            <label className="block cursor-pointer">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Spinner />
                    <p className="text-sm text-gray-600">Mengupload gambar...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      Klik untuk upload gambar
                    </p>
                    <p className="mt-1 text-xs text-gray-500">JPG, PNG, WEBP hingga 5MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileSelect}
              />
            </label>
          )}

          {images.length === 0 && !isUploading && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              Belum ada gambar. Tambahkan minimal satu gambar agar produk tampil lebih baik di marketplace utama.
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-900">Informasi Produk</h2>

          <Input
            label="Nama Produk *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Contoh: Paket Template Website UMKM"
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deskripsi *
            </label>
            <CKEditor4
              value={form.description}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, description: value }))
              }
              placeholder="Jelaskan detail produk internal dengan format yang menarik..."
              minHeight="400px"
            />
            <WordCounter text={form.description} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Harga Jual (Rp) *"
              type="number"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
              required
              placeholder="179000"
            />
            <Input
              label="Harga Coret (Rp)"
              type="number"
              value={form.comparePrice}
              onChange={(e) => setForm((prev) => ({ ...prev, comparePrice: e.target.value }))}
              placeholder="249000"
              helperText="Harga sebelum diskon (opsional)"
            />
          </div>

          {form.comparePrice && Number(form.comparePrice) > Number(form.price) && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-green-700">Preview Diskon:</span>
                <span className="text-lg font-bold text-green-600">
                  Rp {Number(form.price).toLocaleString("id-ID")}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  Rp {Number(form.comparePrice).toLocaleString("id-ID")}
                </span>
                <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  -{Math.round(((Number(form.comparePrice) - Number(form.price)) / Number(form.comparePrice)) * 100)}%
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {productType === "PHYSICAL" && !hasVariants ? (
              <Input
                label="Stok *"
                type="number"
                value={form.stock}
                onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                required
              />
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Stok
                </label>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  {productType === "DIGITAL" ? "Unlimited (Digital)" : "Diatur per varian"}
                </div>
              </div>
            )}
          </div>

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
            placeholder="template, website, umkm"
          />

          <Input
            label="Keywords SEO"
            value={form.metaKeywords}
            onChange={(e) => setForm((prev) => ({ ...prev, metaKeywords: e.target.value }))}
            placeholder="produk digital, template website, umkm"
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
              Publish produk
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

        {productType === "PHYSICAL" && (
          <ProductVariantsForm
            hasVariants={hasVariants}
            onHasVariantsChange={setHasVariants}
            variants={variants}
            onVariantsChange={setVariants}
            basePrice={Number(form.price) || 0}
          />
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? "Simpan Perubahan" : "Buat Produk Internal"}
          </Button>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              window.location.href = "/admin/products?tab=internal";
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
