"use client";

import { useEffect, useState } from "react";
import { 
  BookOpen, 
  Plus, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff,
  Star,
  Search,
  Filter,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { tutorialApi } from "@/services/tutorial.service";
import { resolveImageUrl } from "@/lib/image-url";
import toast from "react-hot-toast";

interface Tutorial {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  category: string;
  targetRole: string;
  thumbnail?: string;
  videoUrl?: string;
  sortOrder: number;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "GETTING_STARTED", label: "Memulai" },
  { value: "SELLER_GUIDE", label: "Panduan Seller" },
  { value: "BUYER_GUIDE", label: "Panduan Buyer" },
  { value: "FEATURES", label: "Fitur Platform" },
  { value: "PAYMENT", label: "Pembayaran" },
  { value: "SHIPPING", label: "Pengiriman" },
  { value: "TROUBLESHOOTING", label: "Troubleshooting" },
  { value: "FAQ", label: "FAQ" },
  { value: "OTHER", label: "Lainnya" },
];

const TARGET_ROLES = [
  { value: "ALL", label: "Semua User" },
  { value: "BUYER", label: "Buyer" },
  { value: "SELLER", label: "Seller" },
];

export default function AdminTutorialsPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterRole, setFilterRole] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    category: "OTHER",
    targetRole: "ALL",
    thumbnail: "",
    videoUrl: "",
    sortOrder: 0,
    isPublished: true,
    isFeatured: false,
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    setIsLoading(true);
    try {
      const { data } = await tutorialApi.getAllTutorials();
      setTutorials(data.data || []);
    } catch (error) {
      console.error("Error fetching tutorials:", error);
      toast.error("Gagal memuat tutorial");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      description: "",
      content: "",
      category: "OTHER",
      targetRole: "ALL",
      thumbnail: "",
      videoUrl: "",
      sortOrder: 0,
      isPublished: true,
      isFeatured: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (tutorial: Tutorial) => {
    setForm({
      title: tutorial.title,
      slug: tutorial.slug,
      description: tutorial.description || "",
      content: tutorial.content,
      category: tutorial.category,
      targetRole: tutorial.targetRole,
      thumbnail: tutorial.thumbnail || "",
      videoUrl: tutorial.videoUrl || "",
      sortOrder: tutorial.sortOrder,
      isPublished: tutorial.isPublished,
      isFeatured: tutorial.isFeatured,
    });
    setEditingId(tutorial.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Judul dan konten wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder),
      };

      if (editingId) {
        await tutorialApi.updateTutorial(editingId, payload);
        toast.success("Tutorial berhasil diupdate");
      } else {
        await tutorialApi.createTutorial(payload);
        toast.success("Tutorial berhasil dibuat");
      }

      resetForm();
      fetchTutorials();
    } catch (error: any) {
      console.error("Error saving tutorial:", error);
      toast.error(error.response?.data?.message || "Gagal menyimpan tutorial");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tutorial ini?")) return;

    try {
      await tutorialApi.deleteTutorial(id);
      toast.success("Tutorial berhasil dihapus");
      fetchTutorials();
    } catch (error) {
      console.error("Error deleting tutorial:", error);
      toast.error("Gagal menghapus tutorial");
    }
  };

  const filteredTutorials = tutorials.filter((tutorial) => {
    const matchesSearch =
      tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutorial.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !filterCategory || tutorial.category === filterCategory;
    const matchesRole = !filterRole || tutorial.targetRole === filterRole;
    return matchesSearch && matchesCategory && matchesRole;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Kelola Tutorial</h1>
          <p className="text-sm text-gray-500">
            Panduan penggunaan platform untuk Seller & Buyer
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Tambah Tutorial
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Total Tutorial</div>
          <div className="text-2xl font-bold text-gray-900">{tutorials.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Published</div>
          <div className="text-2xl font-bold text-emerald-600">
            {tutorials.filter((t) => t.isPublished).length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Featured</div>
          <div className="text-2xl font-bold text-amber-600">
            {tutorials.filter((t) => t.isFeatured).length}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Total Views</div>
          <div className="text-2xl font-bold text-blue-600">
            {tutorials.reduce((sum, t) => sum + t.viewCount, 0)}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Tutorial" : "Tambah Tutorial"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judul <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kosongkan untuk auto-generate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Konten <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="Gunakan Markdown untuk formatting..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Support Markdown: **bold**, *italic*, # heading, - list, dll.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target User
                  </label>
                  <select
                    value={form.targetRole}
                    onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TARGET_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <ImageIcon className="h-4 w-4 inline mr-1" />
                  Thumbnail URL
                </label>
                <input
                  type="url"
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload gambar ke layanan seperti Imgur, Cloudinary, atau gunakan URL gambar yang valid.
                  Rekomendasi ukuran: 1200x630px (rasio 16:9)
                </p>
                {form.thumbnail && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Preview:</p>
                    <div className="relative w-32 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg overflow-hidden">
                      <img
                        src={resolveImageUrl(form.thumbnail)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.style.display = 'flex';
                            fallback.innerHTML = '<span class="text-xs text-red-600">❌ URL tidak valid</span>';
                          }
                        }}
                      />
                      <div 
                        className="absolute inset-0 items-center justify-center hidden"
                        style={{ display: 'none' }}
                      >
                        <BookOpen className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Video className="h-4 w-4 inline mr-1" />
                  YouTube Video URL
                </label>
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL YouTube akan otomatis di-embed di halaman tutorial
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Published</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Featured</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari tutorial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Role</option>
            {TARGET_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tutorial List */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tutorial
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Target
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Views
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTutorials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filterCategory || filterRole
                      ? "Tidak ada tutorial yang cocok dengan filter"
                      : "Belum ada tutorial. Klik tombol Tambah Tutorial untuk membuat."}
                  </td>
                </tr>
              ) : (
                filteredTutorials.map((tutorial) => (
                  <tr key={tutorial.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {tutorial.thumbnail ? (
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <img
                              src={resolveImageUrl(tutorial.thumbnail)}
                              alt={tutorial.title}
                              className="w-full h-full rounded-lg object-cover"
                              onError={(e) => {
                                // Replace with fallback on error
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div 
                              className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg items-center justify-center hidden"
                              style={{ display: 'none' }}
                            >
                              <BookOpen className="h-6 w-6 text-blue-600" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{tutorial.title}</div>
                          {tutorial.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {tutorial.description}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            {tutorial.videoUrl && (
                              <Badge variant="outline" className="text-xs">
                                <Video className="h-3 w-3 mr-1" />
                                Video
                              </Badge>
                            )}
                            {tutorial.isFeatured && (
                              <Badge variant="warning" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === tutorial.category)?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {TARGET_ROLES.find((r) => r.value === tutorial.targetRole)?.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {tutorial.isPublished ? (
                        <Badge variant="success">
                          <Eye className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Draft
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tutorial.viewCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(tutorial)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tutorial.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
