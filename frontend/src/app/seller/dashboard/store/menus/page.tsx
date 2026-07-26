"use client";

import { useEffect, useState, useCallback } from "react";
import { sellerApi } from "@/services/seller.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  ChevronRight,
  Home,
  Package,
  Wrench,
  ExternalLink,
  FileText,
  Save,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

// ============================================
// TYPES
// ============================================

interface StoreMenu {
  id: string;
  label: string;
  type: "page" | "products" | "services" | "external" | "custom";
  url?: string;
  pageSlug?: string;
  icon?: string;
  isVisible: boolean;
  sortOrder: number;
  parentId?: string;
  children?: StoreMenu[];
}

interface MenuFormData {
  label: string;
  type: "page" | "products" | "services" | "external" | "custom";
  url: string;
  pageSlug: string;
  icon: string;
  isVisible: boolean;
  sortOrder: number;
  parentId: string;
}

interface StorePage {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
}

const EMPTY_FORM: MenuFormData = {
  label: "",
  type: "products",
  url: "",
  pageSlug: "",
  icon: "",
  isVisible: true,
  sortOrder: 0,
  parentId: "",
};

const MENU_TYPE_OPTIONS = [
  { value: "products", label: "Produk", icon: Package },
  { value: "services", label: "Layanan", icon: Wrench },
  { value: "page", label: "Halaman Custom", icon: FileText },
  { value: "external", label: "Link Eksternal", icon: ExternalLink },
  { value: "custom", label: "Custom URL", icon: Home },
];

const ICON_OPTIONS = [
  { value: "home", label: "Home", icon: Home },
  { value: "package", label: "Package", icon: Package },
  { value: "wrench", label: "Wrench", icon: Wrench },
  { value: "file-text", label: "File", icon: FileText },
  { value: "external-link", label: "External", icon: ExternalLink },
];

// ============================================
// COMPONENT
// ============================================

export default function StoreMenusPage() {
  const [menus, setMenus] = useState<StoreMenu[]>([]);
  const [pages, setPages] = useState<StorePage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<StoreMenu | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState<MenuFormData>({ ...EMPTY_FORM });

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchMenus = useCallback(async () => {
    try {
      const { data } = await sellerApi.getStoreMenus();
      setMenus(data.data || []);
    } catch (error) {
      console.error("Failed to fetch menus:", error);
      toast.error("Gagal memuat menu");
    }
  }, []);

  const fetchPages = useCallback(async () => {
    try {
      const { data } = await sellerApi.getStorePages();
      setPages(data.data || []);
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMenus(), fetchPages()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchMenus, fetchPages]);

  // ============================================
  // FORM HANDLERS
  // ============================================

  const openCreateForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setShowForm(true);
  };

  const openEditForm = (menu: StoreMenu) => {
    setForm({
      label: menu.label,
      type: menu.type,
      url: menu.url || "",
      pageSlug: menu.pageSlug || "",
      icon: menu.icon || "",
      isVisible: menu.isVisible,
      sortOrder: menu.sortOrder,
      parentId: menu.parentId || "",
    });
    setEditing(menu);
    setShowForm(true);
  };

  const closeForm = () => {
    setForm({ ...EMPTY_FORM });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.label.trim()) {
      toast.error("Label menu wajib diisi");
      return;
    }

    if (form.type === "page" && !form.pageSlug) {
      toast.error("Pilih halaman untuk menu ini");
      return;
    }

    if ((form.type === "external" || form.type === "custom") && !form.url) {
      toast.error("URL wajib diisi");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: form.label,
        type: form.type,
        url: form.url || undefined,
        pageSlug: form.pageSlug || undefined,
        icon: form.icon || undefined,
        isVisible: form.isVisible,
        sortOrder: form.sortOrder,
        parentId: form.parentId || undefined,
      };

      if (editing) {
        await sellerApi.updateStoreMenu(editing.id, payload);
        toast.success("Menu berhasil diperbarui");
      } else {
        await sellerApi.createStoreMenu(payload);
        toast.success("Menu berhasil dibuat");
      }

      closeForm();
      fetchMenus();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Gagal menyimpan menu";
      toast.error(Array.isArray(message) ? message[0] : message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus menu ini? Submenu juga akan terhapus.")) {
      return;
    }

    setDeleting(id);
    try {
      await sellerApi.deleteStoreMenu(id);
      toast.success("Menu berhasil dihapus");
      fetchMenus();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Gagal menghapus menu";
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  const toggleVisibility = async (menu: StoreMenu) => {
    try {
      await sellerApi.updateStoreMenu(menu.id, {
        isVisible: !menu.isVisible,
      });
      toast.success(menu.isVisible ? "Menu disembunyikan" : "Menu ditampilkan");
      fetchMenus();
    } catch (error) {
      toast.error("Gagal mengubah visibilitas menu");
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderMenuIcon = (type: string) => {
    const option = MENU_TYPE_OPTIONS.find((o) => o.value === type);
    const Icon = option?.icon || Menu;
    return <Icon className="h-4 w-4" />;
  };

  const renderMenuItem = (menu: StoreMenu, level: number = 0) => {
    const isDeleting = deleting === menu.id;

    return (
      <div key={menu.id} className="border-b border-gray-100 last:border-0">
        <div
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          style={{ paddingLeft: `${level * 2 + 1}rem` }}
        >
          {/* Drag Handle */}
          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />

          {/* Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600">
            {renderMenuIcon(menu.type)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">
                {menu.label}
              </p>
              <Badge variant={menu.isVisible ? "success" : "secondary"} size="sm">
                {menu.isVisible ? "Visible" : "Hidden"}
              </Badge>
              {menu.children && menu.children.length > 0 && (
                <Badge variant="default" size="sm">
                  {menu.children.length} submenu
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {menu.type === "page" && `Halaman: ${menu.pageSlug}`}
              {menu.type === "products" && "Halaman Produk"}
              {menu.type === "services" && "Halaman Layanan"}
              {(menu.type === "external" || menu.type === "custom") && menu.url}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleVisibility(menu)}
              className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title={menu.isVisible ? "Sembunyikan" : "Tampilkan"}
            >
              {menu.isVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => openEditForm(menu)}
              className="p-2 rounded-lg text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(menu.id)}
              disabled={isDeleting}
              className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
              title="Hapus"
            >
              {isDeleting ? (
                <Spinner size="sm" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Render Children */}
        {menu.children && menu.children.length > 0 && (
          <div className="bg-gray-50/50">
            {menu.children.map((child) => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Menu Navigasi</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Kelola menu navigasi yang tampil di website toko Anda
          </p>
        </div>
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-1" /> Tambah Menu
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              {editing ? "Edit Menu" : "Tambah Menu Baru"}
            </h3>
            <button
              onClick={closeForm}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Label Menu <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Contoh: Beranda, Produk, Tentang Kami"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipe Menu <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as MenuFormData["type"],
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                {MENU_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Page Slug (if type is page) */}
            {form.type === "page" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Pilih Halaman <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.pageSlug}
                  onChange={(e) => setForm({ ...form, pageSlug: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  required
                >
                  <option value="">-- Pilih Halaman --</option>
                  {pages
                    .filter((p) => p.isPublished)
                    .map((page) => (
                      <option key={page.id} value={page.slug}>
                        {page.title}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* URL (if type is external or custom) */}
            {(form.type === "external" || form.type === "custom") && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  URL <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com atau /custom-path"
                  required
                />
              </div>
            )}

            {/* Icon */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Icon (Opsional)
              </label>
              <select
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">-- Tanpa Icon --</option>
                {ICON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Parent Menu */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Parent Menu (Opsional)
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                <option value="">-- Top Level Menu --</option>
                {menus.map((menu) => (
                  <option
                    key={menu.id}
                    value={menu.id}
                    disabled={editing?.id === menu.id}
                  >
                    {menu.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Pilih parent untuk membuat submenu dropdown
              </p>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Urutan
              </label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm({ ...form, sortOrder: Number(e.target.value) })
                }
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Angka lebih kecil akan tampil lebih dulu
              </p>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isVisible"
                checked={form.isVisible}
                onChange={(e) =>
                  setForm({ ...form, isVisible: e.target.checked })
                }
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isVisible" className="text-sm text-gray-700">
                Tampilkan menu di website
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button type="submit" size="sm" isLoading={saving}>
                <Save className="h-4 w-4 mr-1" />
                {editing ? "Update" : "Simpan"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={closeForm}
              >
                Batal
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Menu List */}
      {menus.length === 0 ? (
        <EmptyState
          icon={<Menu className="h-12 w-12 text-gray-300" />}
          title="Belum ada menu"
          description="Buat menu navigasi pertama untuk website toko Anda"
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          {menus.map((menu) => renderMenuItem(menu))}
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 Tips Menu Navigasi
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Menu "Produk" dan "Layanan" otomatis mengarah ke halaman listing</li>
          <li>• Gunakan "Halaman Custom" untuk link ke halaman yang Anda buat</li>
          <li>• "Link Eksternal" untuk mengarah ke website lain</li>
          <li>• Buat submenu dengan memilih parent menu</li>
          <li>• Atur urutan dengan mengubah angka sort order</li>
        </ul>
      </div>
    </div>
  );
}
