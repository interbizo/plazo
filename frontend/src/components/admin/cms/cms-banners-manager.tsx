"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface BannerItem {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  status?: string; // "ACTIVE" | "INACTIVE"
  sortOrder?: number;
  isFallback?: boolean;
}

// ============ CMS BANNERS ============

export function CmsBannersManager() {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    linkUrl: "",
    buttonText: "",
    buttonUrl: "",
    status: "ACTIVE" as string,
    sortOrder: 0,
    isFallback: false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  const fetchBanners = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getCmsBanners();
      const bannersData = data.data || data || [];
      // No need to normalize - backend returns status field
      setBanners(bannersData);
    } catch {
      setBanners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchBanners(); });
  }, [fetchBanners]);

  const resetForm = () => {
    setForm({
      title: "",
      subtitle: "",
      imageUrl: "",
      linkUrl: "",
      buttonText: "",
      buttonUrl: "",
      status: "ACTIVE",
      sortOrder: 0,
      isFallback: false,
    });
    setEditId(null);
    setShowForm(false);
    setImageFile(null);
    setImagePreview("");
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return form.imageUrl;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', imageFile);

      const token = localStorage.getItem('token') || localStorage.getItem('plazo_access_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/api/upload?category=BANNER`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      const uploadedUrl = data.file?.url || data.url;
      
      if (!uploadedUrl) throw new Error('No URL returned from upload');

      return uploadedUrl;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal upload gambar');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title wajib diisi");
      return;
    }
    
    // Check if we have image (either uploaded or existing URL)
    if (!imageFile && !form.imageUrl.trim()) {
      toast.error("Gambar wajib diupload");
      return;
    }

    setSaving(true);
    try {
      // Upload image if new file selected
      let imageUrl = form.imageUrl;
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          setSaving(false);
          return;
        }
        imageUrl = uploadedUrl;
      }

      const payload = {
        ...form,
        imageUrl,
      };

      if (editId) {
        await adminApi.updateCmsBanner(editId, payload);
        toast.success("Banner diupdate");
      } else {
        await adminApi.createCmsBanner(payload);
        toast.success("Banner dibuat");
      }
      resetForm();
      fetchBanners();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal menyimpan";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus banner?")) return;
    try {
      await adminApi.deleteCmsBanner(id);
      toast.success("Dihapus");
      fetchBanners();
    } catch {
      toast.error("Gagal");
    }
  };

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Tambah Banner
        </Button>
      </div>
      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title *"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Subtitle (optional)"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          
          <input
            type="text"
            value={form.linkUrl}
            onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            placeholder="Link URL (optional)"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 w-full"
          />
          
          {/* Button CTA Section */}
          <div className="border-t border-gray-200 pt-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Button CTA (Call to Action) - Optional
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={form.buttonText}
                onChange={(e) => setForm({ ...form, buttonText: e.target.value })}
                placeholder='Text tombol (contoh: "Beli Sekarang")'
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={form.buttonUrl}
                onChange={(e) => setForm({ ...form, buttonUrl: e.target.value })}
                placeholder="URL tujuan tombol"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Jika diisi, tombol akan tampil di banner. Jika kosong, banner tampil tanpa tombol.
            </p>
          </div>
          
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banner Image *
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
              {(imagePreview || form.imageUrl) && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <Image
                    src={imagePreview || form.imageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
              placeholder="Sort Order"
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.status === "ACTIVE"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "ACTIVE" : "INACTIVE" })}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isFallback}
                onChange={(e) => setForm({ ...form, isFallback: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-amber-700">Fallback Banner</span>
            </label>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} isLoading={saving || uploading}>
              {editId ? "Update" : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      )}
      {banners.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="h-12 w-12 text-gray-300" />}
          title="Tidak ada banner"
          description=""
        />
      ) : (
        <div className="space-y-2">
          {banners.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {b.imageUrl && (
                  <Image
                    src={b.imageUrl}
                    alt=""
                    width={64}
                    height={40}
                    className="h-10 w-16 rounded object-cover"
                    unoptimized
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {b.title || "Banner"}
                  </p>
                  {b.subtitle && (
                    <p className="text-xs text-gray-500">{b.subtitle}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={b.status === "ACTIVE" ? "success" : "warning"}>
                      {b.status === "ACTIVE" ? "Active" : "Inactive"}
                    </Badge>
                    {b.isFallback && (
                      <Badge variant="warning">
                        Fallback
                      </Badge>
                    )}
                    {b.buttonText && (
                      <Badge variant="info">
                        Button: {b.buttonText}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setForm({
                      title: b.title || "",
                      subtitle: b.subtitle || "",
                      imageUrl: b.imageUrl || "",
                      linkUrl: b.linkUrl || "",
                      buttonText: b.buttonText || "",
                      buttonUrl: b.buttonUrl || "",
                      status: b.status || "ACTIVE",
                      sortOrder: b.sortOrder || 0,
                      isFallback: b.isFallback || false,
                    });
                    setEditId(b.id);
                    setShowForm(true);
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

