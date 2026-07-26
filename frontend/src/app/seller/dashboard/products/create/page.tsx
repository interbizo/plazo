"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { WordCounter, isOverWordLimit, MAX_WORDS } from "@/components/ui/word-counter";
import ProductTypeForm, { 
  ProductType, 
  DigitalProductData 
} from "@/components/seller/ProductTypeForm";
import ProductVariantsForm, {
  ProductVariant
} from "@/components/seller/ProductVariantsForm";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import type { Category } from "@/types";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

export default function CreateProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingDigitalFile, setIsUploadingDigitalFile] = useState(false);
  
  // Image states
  const [images, setImages] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string>("");
  
  // Product type states
  const [productType, setProductType] = useState<ProductType>('PHYSICAL');
  const [digitalData, setDigitalData] = useState<DigitalProductData>({});
  
  // Variant states
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

  // Auto-save draft to localStorage (survives page refresh)
  const draftKey = "plazo_draft_seller-product-create";
  const draftRestored = useRef(false);
  const canSave = useRef(false);

  // Restore draft on mount
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
    // Allow saving only after 3 seconds (wait for CKEditor init + restore)
    setTimeout(() => { canSave.current = true; }, 3000);
  }, []);

  // Auto-save draft on form change (debounced)
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

  useEffect(() => {
    const load = async () => {
      try {
        const catRes = await sellerApi.getCategories("PRODUCT");
        
        // Use allCategories (flat list) instead of categories (hierarchical)
        setCategories(
          Array.isArray(catRes.data)
            ? catRes.data
            : catRes.data?.allCategories || catRes.data?.categories || [],
        );
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        console.error("Error loading categories:", err);
        toast.error(err?.response?.data?.message || err?.message || "Gagal memuat kategori");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // Handle file selection and auto-upload (for product images)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
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

    // Check total images limit
    if (images.length + validFiles.length > 10) {
      toast.error(`Maksimal 10 gambar. Anda sudah punya ${images.length} gambar.`);
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
        console.log("Appending file:", file.name, file.size, file.type);
      });

      console.log("Valid files to upload:", validFiles.length);
      console.log("Uploading to server...");
      
      const response = await sellerApi.uploadFiles(formData);
      
      console.log("Upload response:", response);
      console.log("Response data:", response.data);

      // Backend returns: { message: "...", files: [{ id, url, ... }] }
      const uploadedFiles = response.data?.files || [];
      console.log("Uploaded files:", uploadedFiles);

      // Extract URLs from files array
      const uploadedUrls = uploadedFiles.map((file: any) => file.url);
      console.log("Extracted URLs:", uploadedUrls);

      // Add to images array
      setImages(prev => {
        const newImages = [...prev, ...uploadedUrls];
        console.log("Updated images:", newImages);
        return newImages;
      });
      
      // Set first uploaded image as thumbnail if no thumbnail set
      if (!thumbnail && uploadedUrls.length > 0) {
        setThumbnail(uploadedUrls[0]);
        console.log("Set thumbnail:", uploadedUrls[0]);
      }

      toast.success(`${uploadedUrls.length} gambar berhasil diupload`);
    } catch (error: any) {
      console.error("Upload error:", error);
      console.error("Error response:", error?.response);
      console.error("Error data:", error?.response?.data);
      toast.error(error?.response?.data?.message || error?.message || "Gagal upload gambar");
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  // Handle digital file upload
  const handleDigitalFileUpload = async (file: File): Promise<{ url: string; size: number; name: string }> => {
    setIsUploadingDigitalFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log("Uploading digital file:", file.name, file.size);
      
      const response = await sellerApi.uploadFiles(formData);
      
      console.log("Digital file upload response:", response);

      // Backend returns: { message: "...", file: { id, url, ... } } for single file
      // or { message: "...", files: [...] } for multiple
      const uploadedFile = response.data?.file || response.data?.files?.[0];

      if (!uploadedFile) {
        throw new Error("No file data in response");
      }

      toast.success("File digital berhasil diupload");

      return {
        url: uploadedFile.url,
        size: uploadedFile.size,
        name: uploadedFile.originalName || file.name,
      };
    } catch (error: any) {
      console.error("Digital file upload error:", error);
      toast.error(error?.response?.data?.message || "Gagal upload file digital");
      throw error;
    } finally {
      setIsUploadingDigitalFile(false);
    }
  };

  // Remove existing image
  const handleRemoveExistingImage = (index: number) => {
    const imageToRemove = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    
    // If removed image was thumbnail, set new thumbnail
    if (imageToRemove === thumbnail) {
      const remainingImages = images.filter((_, i) => i !== index);
      setThumbnail(remainingImages.length > 0 ? remainingImages[0] : "");
    }
  };

  // Set thumbnail
  const handleSetThumbnail = (imageUrl: string) => {
    setThumbnail(imageUrl);
    toast.success("Thumbnail diatur");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user has tenant
    const tenant = typeof window !== "undefined" ? localStorage.getItem("plazo_tenant_subdomain") : null;
    if (!tenant) {
      toast.error("Anda belum memiliki toko. Silakan buat toko terlebih dahulu.");
      router.push("/seller/dashboard/store");
      return;
    }

    // Validation
    if (!form.name || !form.price || !form.categoryId) {
      toast.error("Nama, harga, dan kategori wajib diisi");
      return;
    }

    if (isOverWordLimit(form.description)) {
      toast.error(`Deskripsi melebihi batas ${MAX_WORDS} kata. Silakan kurangi.`);
      return;
    }

    if (productType === 'PHYSICAL' && !hasVariants && !form.stock) {
      toast.error("Stok wajib diisi untuk produk fisik");
      return;
    }

    setIsSubmitting(true);
    try {
      const createData: any = {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
        categoryId: form.subcategoryId || form.categoryId, // Use subcategory if selected, otherwise use main category
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()) : [],
        metaKeywords: form.metaKeywords,
        isPublished: form.isPublished,
        publishToMarketplace: true, // Always publish to marketplace
        
        // Product type
        productType: productType,
        isDigital: productType === 'DIGITAL',
      };

      // Stock handling based on product type
      if (productType === 'PHYSICAL') {
        if (hasVariants) {
          // If has variants, stock is managed per variant
          createData.stock = 0;
        } else {
          createData.stock = Number(form.stock) || 0;
        }
      } else {
        // Digital products don't need stock management
        createData.stock = 999999;
      }

      // Only include images if there are any
      if (images.length > 0) {
        createData.images = images;
        createData.thumbnail = thumbnail || images[0] || "";
      }

      // Include digital product data if digital
      if (productType === 'DIGITAL') {
        createData.digitalFileUrl = digitalData.digitalFileUrl;
        createData.digitalFileSize = digitalData.digitalFileSize;
        createData.digitalFileName = digitalData.digitalFileName;
        createData.downloadLimit = digitalData.downloadLimit;
        createData.downloadExpiry = digitalData.downloadExpiry;
        createData.externalLink = digitalData.externalLink;
        createData.accessInstructions = digitalData.accessInstructions;
        createData.licenseKey = digitalData.licenseKey;
        createData.digitalDeliveryMethod = digitalData.digitalDeliveryMethod;

        // Validate based on delivery method
        if (digitalData.digitalDeliveryMethod === 'FILE_DOWNLOAD' && !digitalData.digitalFileUrl) {
          toast.error("Upload file digital terlebih dahulu");
          setIsSubmitting(false);
          return;
        }

        if ((digitalData.digitalDeliveryMethod === 'EXTERNAL_LINK' || 
             digitalData.digitalDeliveryMethod === 'GOOGLE_DRIVE') && 
            !digitalData.externalLink) {
          toast.error("Masukkan link eksternal");
          setIsSubmitting(false);
          return;
        }

        if (digitalData.digitalDeliveryMethod === 'LICENSE_KEY' && !digitalData.licenseKey) {
          toast.error("Masukkan license key");
          setIsSubmitting(false);
          return;
        }
      }
      
      // Include variants if enabled
      if (hasVariants && variants.length > 0) {
        createData.hasVariants = true;
        // Transform variants to match backend DTO
        createData.variants = variants.map(variant => ({
          name: variant.name,
          price: variant.price || Number(form.price),
          stock: variant.stock,
          sku: variant.sku || undefined,
          options: variant.options.map(opt => ({
            name: opt.optionName,
            value: opt.optionValue,
          })),
        }));
      }
      // Don't send hasVariants: false or empty variants array if not using variants

      console.log("Submitting create data:", JSON.stringify(createData, null, 2));

      await sellerApi.createProduct(createData);
      clearDraft(); // Clear saved draft on success
      toast.success("Produk berhasil dibuat!");
      router.push("/seller/dashboard/products");
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string | string[] } } };
      console.error("Create error:", err);
      console.error("Error response:", errObj?.response?.data);
      
      const errorMessage = errObj?.response?.data?.message;
      const displayMessage = Array.isArray(errorMessage) 
        ? errorMessage.join(", ") 
        : errorMessage || "Gagal membuat produk";
      
      toast.error(displayMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/seller/dashboard/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Tambah Produk Baru</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
        {/* Product Type Selection */}
        <ProductTypeForm
          productType={productType}
          onProductTypeChange={setProductType}
          digitalData={digitalData}
          onDigitalDataChange={(data) => setDigitalData(prev => ({ ...prev, ...data }))}
          onFileUpload={handleDigitalFileUpload}
          isUploading={isUploadingDigitalFile}
        />

        {/* Product Images */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Foto Produk {productType === 'DIGITAL' && '(Opsional)'}
          </h2>
          
          <p className="text-xs text-gray-500">
            {productType === 'DIGITAL' 
              ? 'Upload gambar preview produk digital (opsional). Maksimal 10 gambar.'
              : 'Upload maksimal 10 gambar. Format: JPG, PNG. Ukuran max: 5MB per gambar. Gambar akan langsung diupload saat dipilih.'
            }
          </p>

          {/* Existing Images */}
          {images.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Gambar Produk ({images.length}/10)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, index) => (
                  <div key={`existing-${index}`} className="relative group">
                    <div className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                      {img ? (
                        <img
                          src={img}
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-100">
                                  <div class="text-center text-gray-400">
                                    <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p class="text-xs">Gambar tidak dapat dimuat</p>
                                  </div>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <div className="text-center text-gray-400">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-xs">No image</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Thumbnail badge */}
                    {img === thumbnail && (
                      <div className="absolute top-2 left-2 bg-emerald-600 text-white text-xs px-2 py-1 rounded">
                        Thumbnail
                      </div>
                    )}

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {img !== thumbnail && (
                        <button
                          type="button"
                          onClick={() => handleSetThumbnail(img)}
                          className="bg-white text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100"
                        >
                          Set Thumbnail
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(index)}
                        className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Area */}
          {images.length < 10 && (
            <div>
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <p className="text-sm text-gray-600">Mengupload gambar...</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        Klik untuk pilih gambar atau drag & drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG (max 5MB per file)
                      </p>
                    </>
                  )}
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Informasi Produk
          </h2>

          <Input
            label="Nama Produk *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Contoh: Kaos Polos Premium"
            required
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
              placeholder="Jelaskan detail produk Anda dengan format yang menarik..."
              minHeight="400px"
            />
            <WordCounter text={form.description} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Harga (Rp) *"
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="50000"
              required
            />
            <Input
              label="Harga Coret (Rp)"
              type="number"
              value={form.comparePrice}
              onChange={(e) => setForm({ ...form, comparePrice: e.target.value })}
              placeholder="75000"
              helperText="Harga sebelum diskon (opsional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {productType === 'PHYSICAL' && !hasVariants && (
              <Input
                label="Stok *"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                helperText="Jumlah stok tersedia"
                placeholder="100"
                required
              />
            )}
            {productType === 'PHYSICAL' && hasVariants && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Stok
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Diatur per varian
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Stok dikelola di setiap varian
                </p>
              </div>
            )}
            {productType === 'DIGITAL' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Stok
                </label>
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  Unlimited (Digital)
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Produk digital tidak memerlukan stok
                </p>
              </div>
            )}
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
            placeholder="fashion, kaos, premium (pisahkan dengan koma)"
          />

          <Input
            label="Keywords SEO"
            value={form.metaKeywords}
            onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
            placeholder="baju pria, kaos distro, fashion indonesia"
            helperText="Kata kunci untuk membantu SEO (pisahkan dengan koma)"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublished"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isPublished" className="text-sm text-gray-700">
              Publish produk
            </label>
          </div>
        </div>

        {/* Product Variants - Only for Physical Products */}
        {productType === 'PHYSICAL' && (
          <ProductVariantsForm
            hasVariants={hasVariants}
            onHasVariantsChange={setHasVariants}
            variants={variants}
            onVariantsChange={setVariants}
            basePrice={Number(form.price) || 0}
          />
        )}

        {/* Marketplace Publishing */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Visibilitas Marketplace
          </h2>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="publishToMarketplace"
              checked={true}
              disabled={true}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 opacity-60 cursor-not-allowed"
            />
            <div>
              <label
                htmlFor="publishToMarketplace"
                className="text-sm font-medium text-gray-700"
              >
                Publish ke Marketplace Utama
              </label>
              <p className="text-xs text-gray-500">
                Produk akan tampil di halaman utama marketplace dan bisa ditemukan semua user
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            Buat Produk
          </Button>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              window.location.href = "/seller/dashboard/products";
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
