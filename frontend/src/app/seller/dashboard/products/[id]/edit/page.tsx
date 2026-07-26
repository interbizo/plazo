"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { sellerApi } from "@/services/seller.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { WordCounter, isOverWordLimit, MAX_WORDS } from "@/components/ui/word-counter";
import ProductTypeForm, { 
  ProductType, 
  DigitalProductData,
  DigitalDeliveryMethod
} from "@/components/seller/ProductTypeForm";
import ProductVariantsForm, {
  ProductVariant
} from "@/components/seller/ProductVariantsForm";
import toast from "react-hot-toast";
import { ArrowLeft, Upload, X, Image as ImageIcon, Trash2 } from "lucide-react";
import Link from "next/link";
import type { Product, Category } from "@/types";
import { CategorySubcategorySelect } from "@/components/ui/category-subcategory-select";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

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
    publishToMarketplace: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          sellerApi.getProduct(productId),
          sellerApi.getCategories("PRODUCT"),
        ]);
        
        // Use allCategories (flat list) instead of categories (hierarchical)
        const allCats = Array.isArray(catRes.data)
          ? catRes.data
          : catRes.data?.allCategories || catRes.data?.categories || [];
        
        setCategories(allCats);
        
        // Backend returns { data: product }
        const product = prodRes.data?.data || prodRes.data;
        
        console.log("Loaded product:", product);
        
        if (product && product.id) {
          // Determine if categoryId is a parent or subcategory
          const productCategory = allCats.find((cat: Category) => cat.id === product.categoryId);
          
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
            publishToMarketplace: product.publishToMarketplace ?? false,
          });
          
          // Set product type
          setProductType(product.productType || 'PHYSICAL');
          
          // Set digital data if digital product
          if (product.productType === 'DIGITAL' || product.isDigital) {
            setDigitalData({
              digitalFileUrl: product.digitalFileUrl,
              digitalFileSize: product.digitalFileSize,
              digitalFileName: product.digitalFileName,
              downloadLimit: product.downloadLimit,
              downloadExpiry: product.downloadExpiry,
              externalLink: product.externalLink,
              accessInstructions: product.accessInstructions,
              licenseKey: product.licenseKey,
              digitalDeliveryMethod: product.digitalDeliveryMethod as DigitalDeliveryMethod | undefined,
            });
          }
          
          // Set existing images and thumbnail
          const productImages = product.images || [];
          const productThumbnail = product.thumbnail || "";
          
          console.log("Product images:", productImages);
          console.log("Product thumbnail:", productThumbnail);
          
          setImages(Array.isArray(productImages) ? productImages : []);
          setThumbnail(productThumbnail);
          
          // If no thumbnail but has images, set first image as thumbnail
          if (!productThumbnail && productImages.length > 0) {
            setThumbnail(productImages[0]);
          }
          
          // Set variants if product has variants
          if (product.hasVariants) {
            setHasVariants(true);
            setVariants(
              Array.isArray(product.variants)
                ? product.variants.map((variant: any, index: number) => ({
                    id: variant.id,
                    name: variant.name || "",
                    sku: variant.sku || "",
                    price: variant.price ?? undefined,
                    stock: variant.stock || 0,
                    isActive: variant.isActive ?? true,
                    sortOrder: variant.sortOrder ?? index,
                    options: Array.isArray(variant.options)
                      ? variant.options.map((opt: any) => ({
                          optionName: opt.optionName || opt.name || "",
                          optionValue: opt.optionValue || opt.value || "",
                        }))
                      : [],
                  }))
                : [],
            );
          } else {
            setHasVariants(false);
            setVariants([]);
          }
        } else {
          toast.error("Data produk tidak ditemukan");
          router.push("/seller/dashboard/products");
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } }; message?: string };
        console.error("Error loading product:", err);
        toast.error(err?.response?.data?.message || err?.message || "Gagal memuat data produk");
        router.push("/seller/dashboard/products");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [productId, router]);

  // Handle file selection and auto-upload (for product images)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} bukan file gambar`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} terlalu besar (max 5MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      console.log("No valid files selected");
      return;
    }

    // Check total images limit
    if (images.length + validFiles.length > 10) {
      toast.error(`Maksimal 10 gambar. Anda sudah punya ${images.length} gambar.`);
      return;
    }

    console.log("Valid files to upload:", validFiles.length);

    // Auto-upload immediately
    setIsUploading(true);
    try {
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
        console.log("Appending file:", file.name, file.size, file.type);
      });

      console.log("Uploading to server...");
      const response = await sellerApi.uploadFiles(formData);
      
      console.log("Upload response:", response);
      console.log("Response data:", response.data);
      
      // Backend returns: { message: "...", files: [{ id, url, ... }] }
      const uploadedFiles = response.data?.files || [];
      
      console.log("Uploaded files:", uploadedFiles);

      if (!uploadedFiles || uploadedFiles.length === 0) {
        console.error("No files in response:", response.data);
        toast.error("Upload gagal. Tidak ada file yang berhasil diupload.");
        return;
      }

      // Extract URLs from files array
      const uploadedUrls = uploadedFiles.map((file: any) => file.url);
      
      console.log("Extracted URLs:", uploadedUrls);

      // Add uploaded URLs to images
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

    if (isOverWordLimit(form.description)) {
      toast.error(`Deskripsi melebihi batas ${MAX_WORDS} kata. Silakan kurangi.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const updateData: any = {
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
        updateData.stock = Number(form.stock) || 0;
      } else {
        // Digital products don't need stock management
        updateData.stock = 999999;
      }

      // Only include images if there are any
      if (images.length > 0) {
        updateData.images = images;
        updateData.thumbnail = thumbnail || images[0] || "";
      }

      // Include digital product data if digital
      if (productType === 'DIGITAL') {
        updateData.digitalFileUrl = digitalData.digitalFileUrl;
        updateData.digitalFileSize = digitalData.digitalFileSize;
        updateData.digitalFileName = digitalData.digitalFileName;
        updateData.downloadLimit = digitalData.downloadLimit;
        updateData.downloadExpiry = digitalData.downloadExpiry;
        updateData.externalLink = digitalData.externalLink;
        updateData.accessInstructions = digitalData.accessInstructions;
        updateData.licenseKey = digitalData.licenseKey;
        updateData.digitalDeliveryMethod = digitalData.digitalDeliveryMethod;
      }
      
      // Include variants if enabled
      if (hasVariants && variants.length > 0) {
        updateData.hasVariants = true;
        updateData.stock = 0;
        updateData.variants = variants.map((variant) => ({
          name: variant.name,
          price: variant.price || Number(form.price),
          stock: variant.stock,
          sku: variant.sku || undefined,
          options: variant.options.map((opt) => ({
            name: opt.optionName,
            value: opt.optionValue,
          })),
        }));
      } else {
        updateData.hasVariants = false;
        delete updateData.variants;
      }

      // Validate digital product data
      if (productType === 'DIGITAL') {
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

      console.log("Submitting update data:", updateData);

      await sellerApi.updateProduct(productId, updateData);
      toast.success("Produk berhasil diperbarui!");
      router.push("/seller/dashboard/products");
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string | string[] } } };
      console.error("Update error:", err);
      const errorMessage = errObj?.response?.data?.message;
      toast.error(
        Array.isArray(errorMessage)
          ? errorMessage.join(", ")
          : errorMessage || "Gagal memperbarui produk",
      );
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
          href="/seller/dashboard/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Edit Produk</h1>
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

          {/* No images message */}
          {images.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Produk ini belum memiliki gambar. Silakan upload gambar produk.
              </p>
            </div>
          )}

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
                    {thumbnail === img && (
                      <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                        Thumbnail
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      {thumbnail !== img && (
                        <button
                          type="button"
                          onClick={() => handleSetThumbnail(img)}
                          className="bg-white text-gray-700 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 shadow-sm"
                        >
                          Set Thumbnail
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(index)}
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {images.length < 10 && (
            <div>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isUploading 
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                    : 'border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                }`}>
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Spinner />
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        Mengupload gambar...
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">
                        Klik untuk pilih gambar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        atau drag & drop gambar di sini
                      </p>
                      <p className="text-xs text-emerald-600 mt-2 font-medium">
                        Gambar akan langsung diupload
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {images.length >= 10 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                ℹ️ Maksimal 10 gambar sudah tercapai. Hapus gambar jika ingin menambah yang baru.
              </p>
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
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Deskripsi
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
            {productType === 'PHYSICAL' && (
              <Input
                label="Stok *"
                type="number"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                helperText="Jumlah stok tersedia"
              />
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
            placeholder="Pisahkan dengan koma"
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
            Simpan Perubahan
          </Button>
          <Link
            href="/seller/dashboard/products"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
