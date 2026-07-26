"use client";

import { useEffect, useState, startTransition } from "react";
import { sellerApi } from "@/services/seller.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Briefcase, Plus, Edit, Trash2, X, Upload } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { uploadApi } from "@/services/upload.service";

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  link?: string;
  tags?: string[];
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PortfolioItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    images: [] as string[],
    link: "",
    tags: [] as string[],
  });

  const handlePortfolioImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const removePortfolioImage = () => {
    if (imagePreview && !imagePreview.startsWith("http")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview("");
    setForm((prev) => ({ ...prev, images: [] }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await sellerApi.getPortfolio();
      startTransition(() => {
        // Backend returns array directly
        setItems(Array.isArray(data) ? data : []);
      });
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
      startTransition(() => {
        setItems([]);
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    if (imagePreview && !imagePreview.startsWith("http")) {
      URL.revokeObjectURL(imagePreview);
    }
    setForm({ title: "", description: "", images: [], link: "", tags: [] });
    setImageFile(null);
    setImagePreview("");
    setEditing(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title) {
      toast.error("Judul wajib diisi");
      return;
    }
    setSaving(true);
    try {
      let finalImages = form.images || [];
      if (imageFile) {
        setUploadingImage(true);
        const { data } = await uploadApi.uploadFile(imageFile, "PORTFOLIO");
        finalImages = [data.file.url];
        setUploadingImage(false);
      }
      const payload = { 
        title: form.title,
        description: form.description || undefined,
        images: finalImages.length > 0 ? finalImages : undefined,
        link: form.link || undefined,
        tags: form.tags && form.tags.length > 0 ? form.tags : undefined,
      };
      if (editing) {
        await sellerApi.updatePortfolioItem(editing.id, payload);
        toast.success("Portfolio diperbarui");
      } else {
        await sellerApi.addPortfolioItem(payload);
        toast.success("Portfolio ditambahkan");
      }
      resetForm();
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      toast.error(apiErr?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item portfolio ini?")) return;
    try {
      await sellerApi.deletePortfolioItem(id);
      toast.success("Portfolio dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  const startEdit = (item: PortfolioItem) => {
    setForm({
      title: item.title || "",
      description: item.description || "",
      images: item.images || [],
      link: item.link || "",
      tags: item.tags || [],
    });
    setImageFile(null);
    setImagePreview(item.images && item.images.length > 0 ? item.images[0] : "");
    setEditing(item);
    setShowForm(true);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Portfolio</h1>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              {editing ? "Edit Portfolio" : "Tambah Portfolio"}
            </h2>
            <button onClick={resetForm}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <div className="space-y-3 max-w-lg">
            <Input
              label="Judul"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gambar Portfolio
              </label>
              {imagePreview ? (
                <div className="relative inline-block mb-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-48 rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removePortfolioImage}
                    className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : null}
              {!imagePreview && (
                <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50">
                  <Upload className="h-4 w-4" />
                  Upload Gambar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePortfolioImageSelect}
                  />
                </label>
              )}
              {uploadingImage && (
                <p className="text-xs text-gray-400 mt-1">Mengupload gambar...</p>
              )}
            </div>
            <Input
              label="Link Proyek (Opsional)"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://example.com/project"
            />
            <Button isLoading={saving} onClick={handleSave}>
              {editing ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-12 w-12 text-gray-300" />}
          title="Belum ada portfolio"
          description="Tambahkan karya terbaik Anda untuk menarik klien."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              {item.images && item.images.length > 0 && (
                <Image
                  src={item.images[0]}
                  alt={item.title}
                  width={400}
                  height={160}
                  className="w-full h-40 object-cover rounded-lg mb-3"
                />
              )}
              <h3 className="text-sm font-semibold text-gray-900">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
              {item.link && (
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline mt-1 block"
                >
                  Lihat Proyek →
                </a>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(item)}
                >
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
