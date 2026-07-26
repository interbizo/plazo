"use client";

import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/services/admin.service";
import { uploadApi } from "@/services/upload.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveImageUrl } from "@/lib/image-url";
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  FileDown,
  Image as ImageIcon,
  X,
  Upload,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface RecommendedTool {
  id: string;
  title: string;
  description?: string;
  type: ToolType;
  fileUrl?: string;
  fileName?: string;
  redirectUrl?: string;
  thumbnail?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

type ToolType = "EBOOK_PDF" | "APPLICATION" | "WEBSITE" | "TOOLS_ONLINE";

const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  EBOOK_PDF: "Ebook / PDF",
  APPLICATION: "Aplikasi",
  WEBSITE: "Website",
  TOOLS_ONLINE: "Tools Online",
};

const TOOL_TYPE_COLORS: Record<ToolType, string> = {
  EBOOK_PDF: "bg-red-100 text-red-700",
  APPLICATION: "bg-blue-100 text-blue-700",
  WEBSITE: "bg-green-100 text-green-700",
  TOOLS_ONLINE: "bg-purple-100 text-purple-700",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  type: "EBOOK_PDF" as ToolType,
  fileUrl: "",
  fileName: "",
  fileSize: 0,
  redirectUrl: "",
  thumbnail: "",
  isActive: true,
  sortOrder: 0,
};

// ============================================
// PAGE
// ============================================

export default function AdminToolsPage() {
  const [tools, setTools] = useState<RecommendedTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // ---- Fetch ----
  const fetchTools = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getRecommendedTools();
      const list = Array.isArray(data) ? data : data.data || data.tools || [];
      setTools(list);
    } catch {
      setTools([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTools();
  }, [fetchTools]);

  // ---- Form helpers ----
  const resetForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (tool: RecommendedTool) => {
    setForm({
      title: tool.title,
      description: tool.description || "",
      type: tool.type,
      fileUrl: tool.fileUrl || "",
      fileName: tool.fileName || "",
      fileSize: 0,
      redirectUrl: tool.redirectUrl || "",
      thumbnail: tool.thumbnail || "",
      isActive: tool.isActive,
      sortOrder: tool.sortOrder ?? 0,
    });
    setEditId(tool.id);
    setShowForm(true);
  };

  const handleFieldChange = (
    field: string,
    value: string | number | boolean,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ---- File Upload ----
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type for EBOOK_PDF
    if (form.type === "EBOOK_PDF") {
      const allowedTypes = ["application/pdf", "application/epub+zip", "application/x-mobipocket-ebook"];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|epub|mobi)$/i)) {
        toast.error("File harus berupa PDF, EPUB, atau MOBI");
        return;
      }
    }

    // Validate file size (max 10MB - backend auto-compresses)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`Ukuran file maksimal 10MB. File Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      console.log(`[Upload] Uploading file:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)}KB`,
        fileType: file.type,
        category: "ATTACHMENT"
      });
      
      const { data } = await uploadApi.uploadFile(formData, "ATTACHMENT");
      
      console.log(`[Upload] Success:`, data.file.url);
      
      handleFieldChange("fileUrl", data.file.url);
      handleFieldChange("fileName", data.file.originalName);
      handleFieldChange("fileSize", data.file.size);
      toast.success("File berhasil diupload");
    } catch (error: unknown) {
      console.error("[Upload] Error:", error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal upload file";
      const errorMsg = Array.isArray(message) ? message[0] : message;
      toast.error(errorMsg);
    } finally {
      setUploadingFile(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPEG, PNG, GIF, WEBP)");
      return;
    }

    // Validate file size (max 10MB - backend auto-compresses)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`Ukuran file maksimal 10MB. File Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      console.log(`[Upload] Uploading thumbnail:`, {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)}KB`,
        fileType: file.type,
        category: "ATTACHMENT"
      });
      
      const { data } = await uploadApi.uploadFile(formData, "ATTACHMENT");
      
      console.log(`[Upload] Success:`, data.file.url);
      
      handleFieldChange("thumbnail", data.file.url);
      toast.success("Thumbnail berhasil diupload");
    } catch (error: unknown) {
      console.error("[Upload] Error:", error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal upload thumbnail";
      const errorMsg = Array.isArray(message) ? message[0] : message;
      toast.error(errorMsg);
    } finally {
      setUploadingThumbnail(false);
      e.target.value = ""; // Reset input
    }
  };

  // ---- CRUD ----
  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Judul wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        thumbnail: form.thumbnail || undefined,
        isActive: form.isActive,
        sortOrder: form.sortOrder,
      };

      if (form.type === "EBOOK_PDF") {
        payload.fileUrl = form.fileUrl || undefined;
        payload.fileName = form.fileName || undefined;
        payload.fileSize = form.fileSize || undefined;
        payload.redirectUrl = form.redirectUrl || undefined;
      } else {
        payload.redirectUrl = form.redirectUrl || undefined;
      }

      if (editId) {
        await adminApi.updateRecommendedTool(editId, payload);
        toast.success("Tools berhasil diupdate");
      } else {
        await adminApi.createRecommendedTool(payload);
        toast.success("Tools berhasil dibuat");
      }
      resetForm();
      fetchTools();
    } catch (error: unknown) {
      console.error("[Save] Error:", error);
      const err = error as { response?: { data?: { message?: string | string[] } } };
      const message = err?.response?.data?.message || "Gagal menyimpan tools";
      const errorMsg = Array.isArray(message) ? message[0] : message;
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus tools ini?")) return;
    try {
      await adminApi.deleteRecommendedTool(id);
      toast.success("Tools berhasil dihapus");
      fetchTools();
    } catch {
      toast.error("Gagal menghapus tools");
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await adminApi.toggleRecommendedToolStatus(id);
      toast.success("Status berhasil diubah");
      fetchTools();
    } catch {
      toast.error("Gagal mengubah status");
    }
  };

  // ---- Render ----
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Tools Rekomendasi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola tools, ebook, dan aplikasi yang direkomendasikan untuk seller
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Tools
        </Button>
      </div>

      {/* ---- Form Modal ---- */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 space-y-4 relative">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {editId ? "Edit Tools" : "Tambah Tools Baru"}
            </h3>
            <button
              onClick={resetForm}
              className="rounded p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Judul <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              placeholder="Nama tools / ebook"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              placeholder="Deskripsi singkat tentang tools ini"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
          </div>

          {/* Type + Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipe Tools
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  handleFieldChange("type", e.target.value as ToolType)
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                {(Object.keys(TOOL_TYPE_LABELS) as ToolType[]).map((key) => (
                  <option key={key} value={key}>
                    {TOOL_TYPE_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Urutan (Sort Order)
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  handleFieldChange("sortOrder", Number(e.target.value))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Conditional: File URL + File Name (EBOOK_PDF) */}
          {form.type === "EBOOK_PDF" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Upload File PDF/Ebook
                </label>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploadingFile ? "Uploading..." : "Pilih File"}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.epub,.mobi"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>
                {form.fileUrl && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <FileDown className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{form.fileName || "File uploaded"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        handleFieldChange("fileUrl", "");
                        handleFieldChange("fileName", "");
                        handleFieldChange("fileSize", 0);
                      }}
                      className="ml-auto text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Atau Redirect URL (opsional)
                </label>
                <input
                  type="text"
                  value={form.redirectUrl}
                  onChange={(e) =>
                    handleFieldChange("redirectUrl", e.target.value)
                  }
                  placeholder="https://... link alternatif"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Conditional: Redirect URL (non-EBOOK_PDF) */}
          {form.type !== "EBOOK_PDF" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Redirect URL
              </label>
              <input
                type="text"
                value={form.redirectUrl}
                onChange={(e) =>
                  handleFieldChange("redirectUrl", e.target.value)
                }
                placeholder="https://... link ke website/aplikasi"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Thumbnail URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Upload Thumbnail
            </label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
                  <Upload className="h-4 w-4" />
                  {uploadingThumbnail ? "Uploading..." : "Pilih Gambar"}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={uploadingThumbnail}
                  className="hidden"
                />
              </label>
            </div>
            {form.thumbnail && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={resolveImageUrl(form.thumbnail)}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleFieldChange("thumbnail", "")}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600">Status:</label>
            <button
              type="button"
              onClick={() => handleFieldChange("isActive", !form.isActive)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                form.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {form.isActive ? (
                <ToggleRight className="h-4 w-4" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              {form.isActive ? "Aktif" : "Nonaktif"}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              {editId ? "Update" : "Simpan"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* ---- List ---- */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : tools.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-12 w-12 text-gray-300" />}
          title="Belum ada tools rekomendasi"
          description="Tambahkan tools, ebook, atau aplikasi untuk seller"
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50/50 transition-colors"
            >
              {/* Thumbnail */}
              <div className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                {tool.thumbnail ? (
                  <img
                    src={resolveImageUrl(tool.thumbnail)}
                    alt={tool.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      (e.target as HTMLImageElement).parentElement!.innerHTML =
                        '<svg class="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                    }}
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tool.title}
                  </p>
                  <span
                    className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      TOOL_TYPE_COLORS[tool.type] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {TOOL_TYPE_LABELS[tool.type] || tool.type}
                  </span>
                  <span
                    className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      tool.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {tool.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                {tool.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {tool.description}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Urutan: {tool.sortOrder ?? 0}
                  {tool.type === "EBOOK_PDF" && tool.fileUrl && (
                    <span className="ml-2">
                      <FileDown className="inline h-3 w-3 mr-0.5" />
                      {tool.fileName || "File"}
                    </span>
                  )}
                  {tool.type !== "EBOOK_PDF" && tool.redirectUrl && (
                    <span className="ml-2">
                      <ExternalLink className="inline h-3 w-3 mr-0.5" />
                      {tool.redirectUrl.length > 40
                        ? tool.redirectUrl.slice(0, 40) + "..."
                        : tool.redirectUrl}
                    </span>
                  )}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleStatus(tool.id)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    tool.isActive
                      ? "text-green-500 hover:bg-green-50 hover:text-green-700"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
                  title={tool.isActive ? "Nonaktifkan" : "Aktifkan"}
                >
                  {tool.isActive ? (
                    <ToggleRight className="h-5 w-5" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={() => openEdit(tool)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(tool.id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Hapus"
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
