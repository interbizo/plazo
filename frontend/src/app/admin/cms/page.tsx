"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { adminApi } from "@/services/admin.service";
import { uploadApi } from "@/services/upload.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SafeHtml } from "@/components/ui/safe-html";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import Image from "next/image";
import {
  Settings,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Image as ImageIcon,
  HelpCircle,
  Zap,
  Check,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

type Tab = "pages" | "banners" | "faqs" | "settings" | "flash-sale";

export default function AdminCmsPage() {
  const [tab, setTab] = useState<Tab>("settings");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        Content Management System
      </h1>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {(
          [
            { key: "settings", label: "Pengaturan Situs", icon: Settings },
            { key: "pages", label: "Halaman", icon: FileText },
            { key: "banners", label: "Banner", icon: ImageIcon },
            { key: "faqs", label: "FAQ", icon: HelpCircle },
            { key: "flash-sale", label: "Flash Sale", icon: Zap },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-indigo-100 text-indigo-700"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pages" && <CmsPages />}
      {tab === "banners" && <CmsBanners />}
      {tab === "faqs" && <CmsFaqs />}
      {tab === "flash-sale" && <FlashSaleManager />}
      {tab === "settings" && <CmsSettings />}
    </div>
  );
}

// ============ INTERFACES ============

interface CmsPageItem {
  id: string;
  title?: string;
  slug?: string;
  content?: string;
  status?: string;
  isPublished?: boolean;
  isInNavigation?: boolean;
}

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

interface FaqItem {
  id: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
}

interface SettingItem {
  key: string;
  value: string;
  group?: string;
  description?: string;
}

interface FlashSaleEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  _count?: { items?: number };
}

interface FlashSaleItem {
  id: string;
  status?: string;
  position?: string;
  originalPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  eventId?: string;
  product?: { name?: string };
  service?: { name?: string };
  tenant?: { name?: string };
}

// ============ CMS PAGES ============

function CmsPages() {
  const [pages, setPages] = useState<CmsPageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    isPublished: true,
    isInNavigation: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getCmsPages();
      setPages(data.data || data || []);
    } catch {
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchPages(); });
  }, [fetchPages]);

  const resetForm = () => {
    setForm({ title: "", slug: "", content: "", isPublished: true, isInNavigation: false });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || form.title.toLowerCase().replace(/\s+/g, "-"),
        content: form.content,
        status: form.isPublished ? "PUBLISHED" : "DRAFT",
        isInNavigation: form.isInNavigation,
      };
      if (editId) {
        await adminApi.updateCmsPage(editId, payload);
        toast.success("Halaman diupdate");
      } else {
        await adminApi.createCmsPage(payload);
        toast.success("Halaman dibuat");
      }
      resetForm();
      fetchPages();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal menyimpan";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: CmsPageItem) => {
    setForm({
      title: p.title || "",
      slug: p.slug || "",
      content: p.content || "",
      isPublished: p.status === "PUBLISHED" || p.isPublished === true,
      isInNavigation: p.isInNavigation ?? false,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus halaman ini?")) return;
    try {
      await adminApi.deleteCmsPage(id);
      toast.success("Halaman dihapus");
      fetchPages();
    } catch {
      toast.error("Gagal menghapus");
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
          <Plus className="h-4 w-4 mr-1" /> Tambah Page
        </Button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Slug"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>
          <CKEditor4
            value={form.content}
            onChange={(content) => setForm({ ...form, content })}
            placeholder="Tulis konten halaman di sini..."
            minHeight="300px"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
            />{" "}
            Published
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isInNavigation}
              onChange={(e) =>
                setForm({ ...form, isInNavigation: e.target.checked })
              }
            />{" "}
            Tampilkan di Footer
          </label>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              {editId ? "Update" : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12 text-gray-300" />}
          title="Tidak ada halaman"
          description=""
        />
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                  <span>/pages/{p.slug}</span>
                  <Badge variant={(p.status === "PUBLISHED" || p.isPublished) ? "success" : "warning"}>
                    {(p.status === "PUBLISHED" || p.isPublished) ? "Published" : "Draft"}
                  </Badge>
                  {p.isInNavigation && (
                    <Badge variant="info">
                      Di Footer
                    </Badge>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEdit(p)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
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

// ============ CMS BANNERS ============

function CmsBanners() {
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

          <div className="flex items-center gap-4">
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

// ============ CMS FAQS ============

function CmsFaqs() {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ question: "", answer: "", sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchFaqs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getCmsFaqs();
      setFaqs(data.data || data || []);
    } catch {
      setFaqs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchFaqs(); });
  }, [fetchFaqs]);

  const resetForm = () => {
    setForm({ question: "", answer: "", sortOrder: 0 });
    setEditId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.question.trim()) {
      toast.error("Pertanyaan wajib diisi");
      return;
    }
    if (!form.answer.trim()) {
      toast.error("Jawaban wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await adminApi.updateCmsFaq(editId, form);
        toast.success("FAQ diupdate");
      } else {
        await adminApi.createCmsFaq(form);
        toast.success("FAQ dibuat");
      }
      resetForm();
      fetchFaqs();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal menyimpan";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus FAQ?")) return;
    try {
      await adminApi.deleteCmsFaq(id);
      toast.success("Dihapus");
      fetchFaqs();
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
          <Plus className="h-4 w-4 mr-1" /> Tambah FAQ
        </Button>
      </div>
      {showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          <input
            type="text"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder="Pertanyaan"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <CKEditor4
            value={form.answer}
            onChange={(answer) => setForm({ ...form, answer })}
            placeholder="Tulis jawaban di sini..."
            minHeight="200px"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              {editId ? "Update" : "Simpan"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      )}
      {faqs.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="h-12 w-12 text-gray-300" />}
          title="Tidak ada FAQ"
          description=""
        />
      ) : (
        <div className="space-y-2">
          {faqs.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {f.question}
                  </p>
                  <div className="mt-1">
                    <SafeHtml html={f.answer || ""} className="text-xs text-gray-600" />
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      setForm({
                        question: f.question || "",
                        answer: f.answer || "",
                        sortOrder: f.sortOrder || 0,
                      });
                      setEditId(f.id);
                      setShowForm(true);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(f.id)}
                    className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CMS SETTINGS ============

// ============ SETTING FIELD DEFINITIONS ============

interface SettingField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "email" | "color" | "image";
  placeholder?: string;
  hint?: string;
  group: string;
  /** Upload category for image fields */
  uploadCategory?: string;
}

const SETTING_SECTIONS: Array<{
  id: string;
  title: string;
  desc: string;
  fields: SettingField[];
}> = [
  {
    id: "branding",
    title: "Branding & Identitas",
    desc: "Logo, nama, dan identitas visual platform. Catatan: Favicon akan otomatis menggunakan Logo Utama yang diupload",
    fields: [
      { key: "site_name", label: "Nama Platform", type: "text", placeholder: "Plazo", group: "general", hint: "Nama yang tampil di header & footer" },
      { key: "site_tagline", label: "Tagline", type: "text", placeholder: "Marketplace all-in-one", group: "general", hint: "Slogan singkat di bawah logo" },
      { key: "site_description", label: "Deskripsi Platform", type: "textarea", placeholder: "Platform marketplace untuk produk, jasa, dan freelance", group: "general" },
      { key: "site_logo", label: "Logo Utama", type: "image", group: "appearance", hint: "PNG/JPEG, max 300KB. Rekomendasi: 200x60px", uploadCategory: "LOGO" },
      { key: "site_logo_dark", label: "Logo (Dark Mode)", type: "image", group: "appearance", hint: "PNG/JPEG, max 300KB. Logo untuk background gelap", uploadCategory: "LOGO" },
    ],
  },
  {
    id: "appearance",
    title: "Tampilan",
    desc: "Warna dan tema visual platform",
    fields: [
      { key: "primary_color", label: "Warna Utama", type: "color", placeholder: "#2563eb", group: "appearance", hint: "Warna brand utama (tombol, link)" },
      { key: "accent_color", label: "Warna Aksen", type: "color", placeholder: "#10b981", group: "appearance", hint: "Warna sekunder (badge, highlight)" },
      { key: "footer_text", label: "Teks Footer", type: "text", placeholder: "Platform marketplace all-in-one", group: "general" },
    ],
  },
  {
    id: "seo",
    title: "SEO & Meta Tags",
    desc: "Optimasi mesin pencari untuk halaman utama",
    fields: [
      { key: "seo_site_title", label: "Meta Title", type: "text", placeholder: "Plazo — Marketplace SaaS Platform", group: "seo", hint: "Judul yang muncul di Google (maks 60 karakter)" },
      { key: "seo_site_description", label: "Meta Description", type: "textarea", placeholder: "Platform marketplace all-in-one untuk produk, jasa, dan freelance", group: "seo", hint: "Deskripsi di Google (maks 160 karakter)" },
      { key: "seo_site_keywords", label: "Meta Keywords", type: "text", placeholder: "marketplace, freelance, jual beli, jasa", group: "seo", hint: "Kata kunci dipisah koma" },
      { key: "seo_og_image", label: "OG Image", type: "image", group: "seo", hint: "PNG/JPEG, max 300KB. Gambar saat di-share ke social media (1200x630px)", uploadCategory: "BANNER" },
      { key: "seo_robots_txt", label: "Robots.txt", type: "textarea", placeholder: "User-agent: *\nAllow: /", group: "seo", hint: "Aturan crawling untuk search engine" },
      { key: "seo_ga_id", label: "Google Analytics ID", type: "text", placeholder: "G-XXXXXXXXXX", group: "seo" },
      { key: "seo_fb_pixel", label: "Facebook Pixel ID", type: "text", placeholder: "123456789", group: "seo" },
    ],
  },
  {
    id: "social",
    title: "Social Media",
    desc: "Link akun social media platform",
    fields: [
      { key: "social_instagram", label: "Instagram", type: "url", placeholder: "https://instagram.com/plazo", group: "social" },
      { key: "social_facebook", label: "Facebook", type: "url", placeholder: "https://facebook.com/plazo", group: "social" },
      { key: "social_twitter", label: "Twitter / X", type: "url", placeholder: "https://x.com/plazo", group: "social" },
      { key: "social_tiktok", label: "TikTok", type: "url", placeholder: "https://tiktok.com/@plazo", group: "social" },
      { key: "social_youtube", label: "YouTube", type: "url", placeholder: "https://youtube.com/@plazo", group: "social" },
      { key: "social_whatsapp", label: "WhatsApp", type: "text", placeholder: "6281234567890", group: "social", hint: "Nomor WA tanpa + (untuk tombol kontak)" },
    ],
  },
  {
    id: "contact",
    title: "Kontak & Alamat",
    desc: "Informasi kontak platform",
    fields: [
      { key: "contact_email", label: "Email Kontak", type: "email", placeholder: "support@plazo.id", group: "general" },
      { key: "contact_phone", label: "Telepon", type: "text", placeholder: "+62 812 3456 7890", group: "general" },
      { key: "contact_address", label: "Alamat", type: "textarea", placeholder: "Jl. Contoh No. 123, Jakarta", group: "general" },
      { key: "contact_whatsapp", label: "WhatsApp Support", type: "text", placeholder: "6281234567890", group: "general", hint: "Nomor WA customer support" },
    ],
  },
  // Email & Notifikasi section is hidden - not needed for now
  // {
  //   id: "email",
  //   title: "Email & Notifikasi",
  //   desc: "Pengaturan email transaksional",
  //   fields: [
  //     { key: "email_from_name", label: "Nama Pengirim", type: "text", placeholder: "Plazo Marketplace", group: "email" },
  //     { key: "email_from_address", label: "Email Pengirim", type: "email", placeholder: "noreply@plazo.id", group: "email" },
  //     { key: "email_support", label: "Email Support", type: "email", placeholder: "support@plazo.id", group: "email" },
  //   ],
  // },
];

// ============ CMS SETTINGS COMPONENT ============

function CmsSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("branding");

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getCmsSettings();
      const obj: Record<string, string> = {};
      const items: SettingItem[] = Array.isArray(data) ? data : data?.data || [];
      items.forEach((s) => { obj[s.key] = s.value; });
      setSettings(obj);
    } catch {
      setSettings({});
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchSettings(); });
  }, [fetchSettings]);

  const handleImageUpload = async (field: SettingField, file: File) => {
    setUploadingKey(field.key);
    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("File harus berupa gambar (JPEG, PNG, GIF, WEBP)");
        setUploadingKey(null);
        return;
      }

      // Validate file size - backend auto-compresses images
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`Ukuran file maksimal 10MB. File Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        setUploadingKey(null);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      console.log(`[Upload] Uploading ${field.label}:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)}KB`,
        fileType: file.type,
        category: field.uploadCategory || "LOGO"
      });

      const { data } = await uploadApi.uploadFile(formData, field.uploadCategory || "LOGO");
      const imageUrl = data.file.url;
      
      console.log(`[Upload] Success:`, imageUrl);
      
      updateField(field.key, imageUrl);
      toast.success(`${field.label} berhasil diupload`);
    } catch (error: unknown) {
      console.error("[Upload] Error:", error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || `Gagal upload ${field.label}`;
      const errorMsg = Array.isArray(message) ? message[0] : message;
      toast.error(errorMsg);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build bulk update payload from all fields
      const payload: Array<{ key: string; value: string; group: string }> = [];
      for (const section of SETTING_SECTIONS) {
        for (const field of section.fields) {
          const val = settings[field.key];
          if (val !== undefined && val !== "") {
            payload.push({ key: field.key, value: val, group: field.group });
          }
        }
      }

      // Validate payload
      if (payload.length === 0) {
        toast.error("Tidak ada perubahan untuk disimpan");
        setSaving(false);
        return;
      }

      await adminApi.bulkUpdateCmsSettings(payload);
      toast.success("Pengaturan berhasil disimpan!");
      
      // Clear cache so changes appear immediately
      if (typeof window !== "undefined") {
        localStorage.removeItem('site_settings');
      }
      
      fetchSettings(); // Refresh to get latest data
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal menyimpan pengaturan";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const currentSection = SETTING_SECTIONS.find((s) => s.id === activeSection) || SETTING_SECTIONS[0];

  return (
    <div className="flex gap-6">
      {/* Section nav */}
      <div className="hidden md:block w-48 shrink-0">
        <nav className="sticky top-6 space-y-1">
          {SETTING_SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {section.title}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobile section selector */}
      <div className="md:hidden w-full">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
        >
          {SETTING_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Fields */}
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">{currentSection.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{currentSection.desc}</p>
        </div>

        <div className="space-y-5">
          {currentSection.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={settings[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              ) : field.type === "color" ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings[field.key] || field.placeholder || "#000000"}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              ) : field.type === "image" ? (
                <div className="space-y-2">
                  {/* Preview */}
                  {settings[field.key] && (
                    <div className="relative inline-block rounded-lg border border-gray-200 bg-gray-50 p-2">
                      <img
                        src={settings[field.key]}
                        alt={field.label}
                        className="max-h-24 max-w-48 object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={() => updateField(field.key, "")}
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  {/* Upload button */}
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 transition-colors">
                    {uploadingKey === field.key ? (
                      <>
                        <Spinner className="h-4 w-4" />
                        <span>Mengupload...</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4" />
                        <span>{settings[field.key] ? "Ganti Gambar" : "Upload Gambar"}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingKey === field.key}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validation is now handled in handleImageUpload
                          handleImageUpload(field, file);
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : (
                <input
                  type={field.type}
                  value={settings[field.key] || ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              )}
              {field.hint && (
                <p className="mt-1 text-[11px] text-gray-400">{field.hint}</p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center gap-3 border-t border-gray-100 pt-6">
          <Button onClick={handleSave} isLoading={saving}>
            Simpan Pengaturan
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('site_settings');
                toast.success('Cache dihapus! Refresh halaman untuk melihat perubahan.');
              }
            }}
          >
            Clear Cache
          </Button>
          <span className="text-xs text-gray-400">
            Perubahan akan langsung berlaku setelah disimpan. Klik "Clear Cache" jika perubahan tidak muncul.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============ FLASH SALE MANAGER ============

function FlashSaleManager() {
  // --- Events ---
  const [events, setEvents] = useState<FlashSaleEvent[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({ name: "", startDate: "", endDate: "" });
  const [savingEvent, setSavingEvent] = useState(false);

  // --- Items ---
  const [items, setItems] = useState<FlashSaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [eventsRes, itemsRes] = await Promise.all([
        adminApi.getFlashSaleEvents(),
        adminApi.getFlashSaleItems(),
      ]);
      startTransition(() => {
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : []);
        setItems(Array.isArray(itemsRes.data) ? itemsRes.data : []);
      });
    } catch {
      setEvents([]);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchData(); });
  }, [fetchData]);

  // --- Event handlers ---
  const resetEventForm = () => {
    setEventForm({ name: "", startDate: "", endDate: "" });
    setEditEventId(null);
    setShowEventForm(false);
  };

  const handleSaveEvent = async () => {
    if (!eventForm.name || !eventForm.startDate || !eventForm.endDate) {
      toast.error("Isi nama, tanggal mulai dan berakhir");
      return;
    }
    setSavingEvent(true);
    try {
      if (editEventId) {
        await adminApi.updateFlashSaleEvent(editEventId, {
          name: eventForm.name,
          startDate: new Date(eventForm.startDate).toISOString(),
          endDate: new Date(eventForm.endDate).toISOString(),
        });
        toast.success("Event diupdate");
      } else {
        await adminApi.createFlashSaleEvent({
          name: eventForm.name,
          startDate: new Date(eventForm.startDate).toISOString(),
          endDate: new Date(eventForm.endDate).toISOString(),
        });
        toast.success("Event dibuat");
      }
      resetEventForm();
      fetchData();
    } catch {
      toast.error("Gagal menyimpan event");
    } finally {
      setSavingEvent(false);
    }
  };

  const handleEditEvent = (ev: FlashSaleEvent) => {
    setEventForm({
      name: ev.name,
      startDate: ev.startDate.slice(0, 16),
      endDate: ev.endDate.slice(0, 16),
    });
    setEditEventId(ev.id);
    setShowEventForm(true);
  };

  const handleToggleEvent = async (ev: FlashSaleEvent) => {
    try {
      await adminApi.updateFlashSaleEvent(ev.id, { isActive: !ev.isActive });
      toast.success(ev.isActive ? "Event dinonaktifkan" : "Event diaktifkan");
      fetchData();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Yakin hapus event ini? Item di dalamnya tidak akan dihapus.")) return;
    try {
      await adminApi.deleteFlashSaleEvent(id);
      toast.success("Event dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  // --- Item handlers ---
  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveFlashSaleItem(id);
      toast.success("Disetujui");
      fetchData();
    } catch {
      toast.error("Gagal approve");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    try {
      await adminApi.rejectFlashSaleItem(id, reason);
      toast.success("Ditolak");
      fetchData();
    } catch {
      toast.error("Gagal reject");
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Yakin hapus item ini?")) return;
    try {
      await adminApi.deleteFlashSaleItem(id);
      toast.success("Dihapus");
      fetchData();
    } catch {
      toast.error("Gagal menghapus");
    }
  };

  // --- Helpers ---
  const now = new Date();
  const getEventStatus = (ev: FlashSaleEvent) => {
    if (!ev.isActive) return { label: "Nonaktif", variant: "danger" as const };
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    if (now < start) return { label: "Akan Datang", variant: "info" as const };
    if (now > end) return { label: "Berakhir", variant: "danger" as const };
    return { label: "Sedang Berlangsung", variant: "success" as const };
  };

  const formatDt = (d: string) => {
    try {
      return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return d; }
  };

  const pendingItems = items.filter((i) => i.status === "PENDING");
  const otherItems = items.filter((i) => i.status !== "PENDING");

  if (isLoading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-8">
      {/* ========== EVENTS ========== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Flash Sale Event</h2>
            <p className="text-xs text-gray-500">Atur periode flash sale. Semua item yang di-approve akan mengikuti waktu event yang aktif.</p>
          </div>
          <Button size="sm" onClick={() => { resetEventForm(); setShowEventForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Buat Event
          </Button>
        </div>

        {showEventForm && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">{editEventId ? "Edit Event" : "Buat Event Baru"}</h3>
            <input
              type="text"
              value={eventForm.name}
              onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
              placeholder='Nama event, misal "Flash Sale Weekend"'
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Mulai</label>
                <input
                  type="datetime-local"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Berakhir</label>
                <input
                  type="datetime-local"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEvent} isLoading={savingEvent}>{editEventId ? "Update" : "Simpan"}</Button>
              <Button size="sm" variant="outline" onClick={resetEventForm}>Batal</Button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Belum ada event. Buat event flash sale pertama.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev) => {
              const st = getEventStatus(ev);
              return (
                <div key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{ev.name}</span>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDt(ev.startDate)} — {formatDt(ev.endDate)}
                      {ev._count?.items !== undefined && <span className="ml-2 text-gray-400">· {ev._count.items} item</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggleEvent(ev)} className={`rounded-lg px-2.5 py-1 text-xs font-medium ${ev.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                      {ev.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button onClick={() => handleEditEvent(ev)} className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDeleteEvent(ev.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600" title="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========== PENDING ITEMS ========== */}
      {pendingItems.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 mb-1">Menunggu Persetujuan</h2>
          <p className="text-xs text-gray-500 mb-3">Item yang diajukan seller dan belum di-review.</p>
          <div className="space-y-2">
            {pendingItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.product?.name || item.service?.name || "-"}</p>
                  <p className="text-xs text-gray-500">
                    {item.tenant?.name || "-"} · <span className="line-through text-gray-400">Rp{item.originalPrice?.toLocaleString("id-ID")}</span>{" "}
                    <span className="font-bold text-red-500">Rp{item.salePrice?.toLocaleString("id-ID")}</span>{" "}
                    <span className="text-red-400">(-{item.discountPercent || 0}%)</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleApprove(item.id)} className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100" title="Approve">
                    <Check className="h-3.5 w-3.5 inline mr-0.5" /> Setujui
                  </button>
                  <button onClick={() => handleReject(item.id)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100" title="Reject">
                    <X className="h-3.5 w-3.5 inline mr-0.5" /> Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== ALL ITEMS ========== */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-1">Semua Item Flash Sale</h2>
        <p className="text-xs text-gray-500 mb-3">Item yang sudah diproses (approved/rejected).</p>

        {otherItems.length === 0 && pendingItems.length === 0 ? (
          <EmptyState
            icon={<Zap className="h-12 w-12 text-gray-300" />}
            title="Belum ada item flash sale"
            description="Item akan muncul setelah seller mengajukan produk/jasa untuk flash sale."
          />
        ) : otherItems.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Belum ada item yang sudah diproses.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Item</th>
                  <th className="px-4 py-3 text-left">Toko</th>
                  <th className="px-4 py-3 text-right">Harga Asli</th>
                  <th className="px-4 py-3 text-right">Harga Sale</th>
                  <th className="px-4 py-3 text-center">Diskon</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {item.product?.name || item.service?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {item.tenant?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 line-through">
                      Rp{item.originalPrice?.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">
                      Rp{item.salePrice?.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="danger">{item.discountPercent || 0}%</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={item.status === "APPROVED" ? "success" : "danger"}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDeleteItem(item.id)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Hapus">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
