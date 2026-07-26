"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { sellerApi } from "@/services/seller.service";
import { uploadApi } from "@/services/upload.service";
import { getSubdomainLink, getSubdomainUrl } from "@/lib/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  ExternalLink,
  Layout,
  Grid3X3,
  Upload,
  Clock,
  Shield,
  Search,
  Palette,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

interface StoreHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface SocialLinks {
  instagram: string;
  facebook: string;
  twitter: string;
  tiktok: string;
  youtube: string;
  website: string;
}

interface StoreFormState {
  // Tab 1 - Informasi Toko
  name: string;
  tagline: string;
  description: string;
  logo: string;
  banner: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  address: string;
  city: string;
  storeAnnouncement: string;
  // Tab 2 - Tampilan & Tema
  themeColor: string;
  themeSecondary: string;
  themePreset: string;
  themeFontFamily: string;
  themeBorderRadius: string;
  themeShadowStyle: string;
  displayMode: "LANDING_PAGE" | "CATALOG";
  socialLinks: SocialLinks;
  // Tab 3 - SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;
  // Tab 4 - Kebijakan Toko
  returnPolicy: string;
  shippingPolicy: string;
  termsOfService: string;
  privacyPolicy: string;
  // Tab 5 - Jam Operasional
  storeHours: StoreHours;
}

interface StoreInfo {
  subdomain?: string;
  subscriptionPlan?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  usedPosts?: number;
  postsLimit?: number;
  [key: string]: unknown;
}

interface ApiError {
  response?: { data?: { message?: string } };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = [
  { key: "info", label: "Informasi Toko", icon: Store },
  { key: "theme", label: "Tampilan & Tema", icon: Palette },
  { key: "seo", label: "SEO", icon: Search },
  { key: "policy", label: "Kebijakan Toko", icon: Shield },
  { key: "hours", label: "Jam Operasional", icon: Clock },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DAY_LABELS: { key: keyof StoreHours; label: string }[] = [
  { key: "monday", label: "Senin" },
  { key: "tuesday", label: "Selasa" },
  { key: "wednesday", label: "Rabu" },
  { key: "thursday", label: "Kamis" },
  { key: "friday", label: "Jumat" },
  { key: "saturday", label: "Sabtu" },
  { key: "sunday", label: "Minggu" },
];

const THEME_PRESETS = [
  { id: "emerald", name: "Emerald Fresh", primary: "#10b981", secondary: "#064e3b", description: "Segar & modern" },
  { id: "ocean", name: "Ocean Blue", primary: "#0ea5e9", secondary: "#0c4a6e", description: "Tenang & profesional" },
  { id: "sunset", name: "Sunset Orange", primary: "#f97316", secondary: "#7c2d12", description: "Hangat & energik" },
  { id: "royal", name: "Royal Purple", primary: "#a855f7", secondary: "#581c87", description: "Elegan & mewah" },
  { id: "rose", name: "Rose Pink", primary: "#f43f5e", secondary: "#881337", description: "Feminin & lembut" },
  { id: "forest", name: "Forest Green", primary: "#22c55e", secondary: "#14532d", description: "Natural & organik" },
  { id: "midnight", name: "Midnight Dark", primary: "#1e293b", secondary: "#0f172a", description: "Bold & minimalis" },
  { id: "amber", name: "Amber Gold", primary: "#f59e0b", secondary: "#78350f", description: "Premium & klasik" },
  { id: "sky", name: "Sky Light", primary: "#38bdf8", secondary: "#075985", description: "Cerah & friendly" },
  { id: "crimson", name: "Crimson Red", primary: "#dc2626", secondary: "#7f1d1d", description: "Berani & dinamis" },
];

const FONT_FAMILIES = [
  { id: "inter", name: "Inter", description: "Modern & clean" },
  { id: "poppins", name: "Poppins", description: "Friendly & rounded" },
  { id: "roboto", name: "Roboto", description: "Klasik & readable" },
  { id: "playfair", name: "Playfair Display", description: "Elegan & serif" },
  { id: "montserrat", name: "Montserrat", description: "Bold & geometric" },
];

const BORDER_RADIUS_OPTIONS = [
  { id: "none", name: "Sharp", value: "0px", description: "Kotak tajam" },
  { id: "sm", name: "Subtle", value: "4px", description: "Sedikit rounded" },
  { id: "md", name: "Moderate", value: "8px", description: "Rounded sedang" },
  { id: "lg", name: "Soft", value: "16px", description: "Sangat rounded" },
  { id: "full", name: "Pill", value: "9999px", description: "Bulat penuh" },
];

const SHADOW_STYLES = [
  { id: "none", name: "Flat", description: "Tanpa bayangan" },
  { id: "soft", name: "Soft", description: "Bayangan lembut" },
  { id: "medium", name: "Medium", description: "Bayangan sedang" },
  { id: "hard", name: "Hard", description: "Bayangan tegas" },
];

const DEFAULT_HOURS: StoreHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "09:00", close: "17:00", closed: true },
  sunday: { open: "09:00", close: "17:00", closed: true },
};

const DEFAULT_SOCIAL: SocialLinks = {
  instagram: "",
  facebook: "",
  twitter: "",
  tiktok: "",
  youtube: "",
  website: "",
};

const INITIAL_FORM: StoreFormState = {
  name: "",
  tagline: "",
  description: "",
  logo: "",
  banner: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  address: "",
  city: "",
  storeAnnouncement: "",
  themeColor: "#10b981",
  themeSecondary: "#064e3b",
  themePreset: "emerald",
  themeFontFamily: "inter",
  themeBorderRadius: "md",
  themeShadowStyle: "soft",
  displayMode: "CATALOG",
  socialLinks: { ...DEFAULT_SOCIAL },
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: "",
  returnPolicy: "",
  shippingPolicy: "",
  termsOfService: "",
  privacyPolicy: "",
  storeHours: { ...DEFAULT_HOURS },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseSafe<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

// ─── Image Upload Component ─────────────────────────────────────────────────

function ImageUploadField({
  label,
  value,
  onChange,
  aspect,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await uploadApi.uploadFile(formData, "BANNER");
      onChange(data.file.url);
      toast.success("Gambar berhasil diupload");
    } catch {
      toast.error("Gagal mengupload gambar");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt={label}
            className={`w-full rounded-lg border border-gray-200 object-cover ${
              aspect === "banner" ? "h-32" : aspect === "square" ? "h-28 w-28" : "h-32"
            }`}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-gray-100"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500 hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors ${
            aspect === "banner" ? "h-32" : aspect === "square" ? "h-28 w-28" : "h-32"
          }`}
        >
          {uploading ? (
            <Spinner size="sm" className="text-emerald-600" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span>Upload Gambar</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Color Picker Field ─────────────────────────────────────────────────────

function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#10b981"}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-gray-300 p-0.5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#10b981"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <div
          className="h-9 w-9 rounded-lg border border-gray-200"
          style={{ backgroundColor: value || "#10b981" }}
        />
      </div>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function SellerStoreSettingsPage() {
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [form, setForm] = useState<StoreFormState>({ ...INITIAL_FORM });

  // ── Load store data ──────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await sellerApi.getStoreSettings();
        const storeData = data.data || data;
        setStore(storeData);
        setForm({
          name: (storeData.name as string) || "",
          tagline: (storeData.tagline as string) || "",
          description: (storeData.description as string) || "",
          logo: (storeData.logo as string) || "",
          banner: (storeData.banner as string) || "",
          contactEmail: (storeData.contactEmail as string) || "",
          contactPhone: (storeData.contactPhone as string) || "",
          contactWhatsapp: (storeData.contactWhatsapp as string) || "",
          address: (storeData.address as string) || "",
          city: (storeData.city as string) || "",
          storeAnnouncement: (storeData.storeAnnouncement as string) || "",
          themeColor: (storeData.themeColor as string) || "#10b981",
          themeSecondary: (storeData.themeSecondary as string) || "#064e3b",
          themePreset: (storeData.themePreset as string) || "emerald",
          themeFontFamily: (storeData.themeFontFamily as string) || "inter",
          themeBorderRadius: (storeData.themeBorderRadius as string) || "md",
          themeShadowStyle: (storeData.themeShadowStyle as string) || "soft",
          displayMode:
            (storeData.displayMode as "LANDING_PAGE" | "CATALOG") || "CATALOG",
          socialLinks: parseSafe<SocialLinks>(
            storeData.socialLinks,
            { ...DEFAULT_SOCIAL },
          ),
          metaTitle: (storeData.metaTitle as string) || "",
          metaDescription: (storeData.metaDescription as string) || "",
          metaKeywords: (storeData.metaKeywords as string) || "",
          ogImage: (storeData.ogImage as string) || "",
          returnPolicy: (storeData.returnPolicy as string) || "",
          shippingPolicy: (storeData.shippingPolicy as string) || "",
          termsOfService: (storeData.termsOfService as string) || "",
          privacyPolicy: (storeData.privacyPolicy as string) || "",
          storeHours: parseSafe<StoreHours>(
            storeData.storeHours,
            { ...DEFAULT_HOURS },
          ),
        });
      } catch {
        toast.error("Gagal memuat pengaturan toko");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof StoreFormState>(key: K, value: StoreFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateSocial = useCallback((key: keyof SocialLinks, value: string) => {
    setForm((prev) => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [key]: value },
    }));
  }, []);

  const updateHours = useCallback(
    (day: keyof StoreHours, field: keyof DaySchedule, value: string | boolean) => {
      setForm((prev) => {
        // Ensure storeHours exists
        const currentHours = prev.storeHours || { ...DEFAULT_HOURS };
        
        // Ensure the day exists
        const currentDay = currentHours[day] || { open: "09:00", close: "17:00", closed: false };
        
        return {
          ...prev,
          storeHours: {
            ...currentHours,
            [day]: { ...currentDay, [field]: value },
          },
        };
      });
    },
    [],
  );

  // ── Save handler ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare data with proper JSON stringification for complex objects
      const dataToSave = {
        ...form,
        socialLinks: JSON.stringify(form.socialLinks),
        storeHours: JSON.stringify(form.storeHours),
      };
      
      await sellerApi.updateStoreSettings(dataToSave as unknown as Record<string, unknown>);
      toast.success("Pengaturan toko berhasil diperbarui!");
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      toast.error(apiErr?.response?.data?.message || "Gagal menyimpan pengaturan");
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  // ── Tab content renderers ────────────────────────────────────────────────

  const renderInfoTab = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Informasi Dasar</h2>

        <Input
          label="Nama Toko"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Nama toko Anda"
        />

        <Input
          label="Tagline"
          value={form.tagline}
          onChange={(e) => updateField("tagline", e.target.value)}
          placeholder="Slogan singkat toko Anda"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Deskripsi
          </label>
          <textarea
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Deskripsi lengkap tentang toko Anda..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Logo & Banner</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="Logo Toko"
            value={form.logo}
            onChange={(url) => updateField("logo", url)}
            aspect="square"
          />
          <ImageUploadField
            label="Banner Toko"
            value={form.banner}
            onChange={(url) => updateField("banner", url)}
            aspect="banner"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Kontak</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email Kontak"
            type="email"
            value={form.contactEmail}
            onChange={(e) => updateField("contactEmail", e.target.value)}
            placeholder="email@contoh.com"
          />
          <Input
            label="No. Telepon"
            value={form.contactPhone}
            onChange={(e) => updateField("contactPhone", e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </div>

        <Input
          label="WhatsApp"
          value={form.contactWhatsapp}
          onChange={(e) => updateField("contactWhatsapp", e.target.value)}
          placeholder="628xxxxxxxxxx"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Alamat
          </label>
          <textarea
            value={form.address}
            onChange={(e) => updateField("address", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Alamat lengkap toko Anda"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kota
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Contoh: Jakarta, Bandung, Surabaya"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-400">
            Kota ini akan digunakan untuk filter lokasi di marketplace
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Pengumuman</h2>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Pengumuman Toko
          </label>
          <textarea
            value={form.storeAnnouncement}
            onChange={(e) => updateField("storeAnnouncement", e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            placeholder="Pengumuman yang tampil di toko"
          />
        </div>
      </div>

      <Button onClick={handleSave} isLoading={isSaving}>
        Simpan Informasi Toko
      </Button>
    </div>
  );

  const renderThemeTab = () => {
    const applyPreset = (presetId: string) => {
      const preset = THEME_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        setForm((prev) => ({
          ...prev,
          themePreset: preset.id,
          themeColor: preset.primary,
          themeSecondary: preset.secondary,
        }));
      }
    };

    return (
      <div className="space-y-5">
        {/* Theme Presets */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Preset Tema</h2>
            <p className="mt-1 text-xs text-gray-500">
              Pilih tema siap pakai atau kustomisasi sendiri
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`group relative rounded-lg border-2 p-3 text-left transition-all hover:shadow-md ${
                  form.themePreset === preset.id
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-12 rounded-md mb-2"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                  }}
                />
                <p className="text-xs font-semibold text-gray-900">{preset.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{preset.description}</p>
                {form.themePreset === preset.id && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Colors */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Kustomisasi Warna</h2>
            <p className="mt-1 text-xs text-gray-500">
              Sesuaikan warna tema sesuai brand Anda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorPickerField
              label="Warna Utama"
              value={form.themeColor}
              onChange={(val) => {
                updateField("themeColor", val);
                updateField("themePreset", "custom");
              }}
            />
            <ColorPickerField
              label="Warna Sekunder"
              value={form.themeSecondary}
              onChange={(val) => {
                updateField("themeSecondary", val);
                updateField("themePreset", "custom");
              }}
            />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-gray-500">Preview:</span>
            <div
              className="h-8 flex-1 rounded-lg"
              style={{
                background: `linear-gradient(135deg, ${form.themeColor || "#10b981"}, ${form.themeSecondary || "#064e3b"})`,
              }}
            />
          </div>
        </div>

        {/* Font Family */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Font</h2>
            <p className="mt-1 text-xs text-gray-500">
              Pilih font yang sesuai dengan karakter toko Anda
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FONT_FAMILIES.map((font) => (
              <button
                key={font.id}
                onClick={() => updateField("themeFontFamily", font.id)}
                className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                  form.themeFontFamily === font.id
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{font.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{font.description}</p>
                {form.themeFontFamily === font.id && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Border Radius */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Sudut & Bentuk</h2>
            <p className="mt-1 text-xs text-gray-500">
              Atur tingkat kebulatan elemen UI
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BORDER_RADIUS_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => updateField("themeBorderRadius", option.id)}
                className={`relative rounded-lg border-2 p-3 text-center transition-all ${
                  form.themeBorderRadius === option.id
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className="h-10 w-full bg-gray-300 mb-2 mx-auto"
                  style={{ borderRadius: option.value }}
                />
                <p className="text-xs font-semibold text-gray-900">{option.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{option.description}</p>
                {form.themeBorderRadius === option.id && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Shadow Style */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Bayangan</h2>
            <p className="mt-1 text-xs text-gray-500">
              Pilih gaya bayangan untuk elemen UI
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SHADOW_STYLES.map((shadow) => (
              <button
                key={shadow.id}
                onClick={() => updateField("themeShadowStyle", shadow.id)}
                className={`relative rounded-lg border-2 p-4 text-center transition-all ${
                  form.themeShadowStyle === shadow.id
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={`h-12 w-full bg-white rounded-lg mb-2 ${
                    shadow.id === "none" ? "" :
                    shadow.id === "soft" ? "shadow-sm" :
                    shadow.id === "medium" ? "shadow-md" :
                    "shadow-lg"
                  }`}
                />
                <p className="text-xs font-semibold text-gray-900">{shadow.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{shadow.description}</p>
                {form.themeShadowStyle === shadow.id && (
                  <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Display Mode */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Mode Tampilan Toko
          </h2>
          <p className="text-xs text-gray-500">
            Pilih bagaimana toko Anda ditampilkan kepada pengunjung.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                form.displayMode === "LANDING_PAGE"
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="displayMode"
                value="LANDING_PAGE"
                checked={form.displayMode === "LANDING_PAGE"}
                onChange={() => updateField("displayMode", "LANDING_PAGE")}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    form.displayMode === "LANDING_PAGE"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Layout className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Landing Page
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Tampilan seperti website promosi dengan hero banner dan
                    deskripsi
                  </p>
                </div>
              </div>
              {form.displayMode === "LANDING_PAGE" && (
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </label>

            <label
              className={`relative flex cursor-pointer rounded-xl border-2 p-4 transition-colors ${
                form.displayMode === "CATALOG"
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="displayMode"
                value="CATALOG"
                checked={form.displayMode === "CATALOG"}
                onChange={() => updateField("displayMode", "CATALOG")}
                className="sr-only"
              />
              <div className="flex items-start gap-3">
                <div
                  className={`rounded-lg p-2 ${
                    form.displayMode === "CATALOG"
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Grid3X3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Katalog Produk
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Tampilan grid produk/jasa untuk penjualan langsung
                  </p>
                </div>
              </div>
              {form.displayMode === "CATALOG" && (
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </label>
          </div>
        </div>

        {/* Social Links */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Media Sosial</h2>
          <p className="text-xs text-gray-500">
            Tambahkan link media sosial yang akan ditampilkan di toko Anda.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                label="Instagram"
                value={form.socialLinks.instagram}
                onChange={(e) => updateSocial("instagram", e.target.value)}
                placeholder="https://instagram.com/username"
              />
            </div>
            <div className="relative">
              <Input
                label="Facebook"
                value={form.socialLinks.facebook}
                onChange={(e) => updateSocial("facebook", e.target.value)}
                placeholder="https://facebook.com/page"
              />
            </div>
            <div className="relative">
              <Input
                label="Twitter / X"
                value={form.socialLinks.twitter}
                onChange={(e) => updateSocial("twitter", e.target.value)}
                placeholder="https://x.com/username"
              />
            </div>
            <div className="relative">
              <Input
                label="TikTok"
                value={form.socialLinks.tiktok}
                onChange={(e) => updateSocial("tiktok", e.target.value)}
                placeholder="https://tiktok.com/@username"
              />
            </div>
            <div className="relative">
              <Input
                label="YouTube"
                value={form.socialLinks.youtube}
                onChange={(e) => updateSocial("youtube", e.target.value)}
                placeholder="https://youtube.com/@channel"
              />
            </div>
            <div className="relative">
              <Input
                label="Website"
                value={form.socialLinks.website}
                onChange={(e) => updateSocial("website", e.target.value)}
                placeholder="https://website.com"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} isLoading={isSaving}>
          Simpan Tampilan & Tema
        </Button>
      </div>
    );
  };

  const renderSeoTab = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Search Engine Optimization
        </h2>
        <p className="text-xs text-gray-500">
          Optimalkan toko Anda agar mudah ditemukan di mesin pencari.
        </p>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Meta Title
            </label>
            <span
              className={`text-xs ${
                form.metaTitle.length > 70
                  ? "text-red-500 font-medium"
                  : "text-gray-400"
              }`}
            >
              {form.metaTitle.length}/70
            </span>
          </div>
          <input
            type="text"
            value={form.metaTitle}
            onChange={(e) => updateField("metaTitle", e.target.value)}
            maxLength={70}
            placeholder="Judul yang tampil di hasil pencarian"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Meta Description
            </label>
            <span
              className={`text-xs ${
                form.metaDescription.length > 160
                  ? "text-red-500 font-medium"
                  : "text-gray-400"
              }`}
            >
              {form.metaDescription.length}/160
            </span>
          </div>
          <textarea
            value={form.metaDescription}
            onChange={(e) => updateField("metaDescription", e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Deskripsi singkat yang tampil di hasil pencarian"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <Input
          label="Meta Keywords"
          value={form.metaKeywords}
          onChange={(e) => updateField("metaKeywords", e.target.value)}
          placeholder="keyword1, keyword2, keyword3"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">OG Image</h2>
        <p className="text-xs text-gray-500">
          Gambar yang ditampilkan saat link toko dibagikan di media sosial.
          Ukuran rekomendasi: 1200x630px.
        </p>
        <ImageUploadField
          label="Open Graph Image"
          value={form.ogImage}
          onChange={(url) => updateField("ogImage", url)}
          aspect="banner"
        />
      </div>

      {/* SEO Preview */}
      {(form.metaTitle || form.metaDescription) && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Preview Hasil Pencarian
          </h2>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <p className="text-base text-blue-700 hover:underline truncate">
              {form.metaTitle || form.name || "Judul Toko Anda"}
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              {store?.subdomain
                ? getSubdomainUrl(store.subdomain)
                : `toko-anda.${process.env.NEXT_PUBLIC_BASE_DOMAIN || "localhost:3000"}`}
            </p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {form.metaDescription ||
                form.description ||
                "Deskripsi toko Anda akan tampil di sini..."}
            </p>
          </div>
        </div>
      )}

      <Button onClick={handleSave} isLoading={isSaving}>
        Simpan Pengaturan SEO
      </Button>
    </div>
  );

  const renderPolicyTab = () => (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Kebijakan Pengembalian
        </h2>
        <textarea
          value={form.returnPolicy}
          onChange={(e) => updateField("returnPolicy", e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder={`Contoh:\n- Pengembalian diterima dalam 7 hari setelah barang diterima\n- Barang harus dalam kondisi asli dan belum digunakan\n- Biaya pengiriman pengembalian ditanggung pembeli`}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Kebijakan Pengiriman
        </h2>
        <textarea
          value={form.shippingPolicy}
          onChange={(e) => updateField("shippingPolicy", e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="Jelaskan kebijakan pengiriman toko Anda, termasuk estimasi waktu, jasa pengiriman yang digunakan, dll."
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Syarat & Ketentuan
        </h2>
        <textarea
          value={form.termsOfService}
          onChange={(e) => updateField("termsOfService", e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="Tuliskan syarat dan ketentuan layanan toko Anda..."
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Kebijakan Privasi
        </h2>
        <textarea
          value={form.privacyPolicy}
          onChange={(e) => updateField("privacyPolicy", e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="Jelaskan bagaimana toko Anda mengelola data pelanggan..."
        />
      </div>

      <Button onClick={handleSave} isLoading={isSaving}>
        Simpan Kebijakan Toko
      </Button>
    </div>
  );

  const renderHoursTab = () => {
    // Ensure storeHours exists with default values
    const storeHours = form.storeHours || { ...DEFAULT_HOURS };
    
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Jam Operasional Toko
          </h2>
          <p className="text-xs text-gray-500">
            Atur jam buka dan tutup toko Anda untuk setiap hari.
          </p>

          <div className="space-y-3">
            {DAY_LABELS.map(({ key, label }) => {
              const day = storeHours[key] || { open: "09:00", close: "17:00", closed: false };
              return (
                <div
                  key={key}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    day.closed
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <span className="w-16 text-sm font-medium text-gray-700 shrink-0">
                    {label}
                  </span>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => updateHours(key, "closed", !day.closed)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      day.closed ? "bg-gray-300" : "bg-emerald-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        day.closed ? "translate-x-0" : "translate-x-5"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-xs w-10 shrink-0 ${
                      day.closed
                        ? "text-red-500 font-medium"
                        : "text-emerald-600 font-medium"
                    }`}
                  >
                    {day.closed ? "Tutup" : "Buka"}
                  </span>

                  {/* Time inputs */}
                  {!day.closed && (
                    <div className="flex items-center gap-2 ml-auto">
                      <input
                        type="time"
                        value={day.open || "09:00"}
                        onChange={(e) =>
                          updateHours(key, "open", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-gray-400">s/d</span>
                      <input
                        type="time"
                        value={day.close || "17:00"}
                        onChange={(e) =>
                          updateHours(key, "close", e.target.value)
                        }
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {day.closed && (
                    <span className="ml-auto text-xs text-gray-400 italic">
                      Toko tutup pada hari ini
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} isLoading={isSaving}>
          Simpan Jam Operasional
        </Button>
      </div>
    );
  };

  // ── Tab content map ──────────────────────────────────────────────────────

  const tabContent: Record<TabKey, () => React.ReactElement> = {
    info: renderInfoTab,
    theme: renderThemeTab,
    seo: renderSeoTab,
    policy: renderPolicyTab,
    hours: renderHoursTab,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Pengaturan Toko</h1>
        {store?.subdomain && (
          <Link
            href={getSubdomainLink(store.subdomain)}
            className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Lihat Toko
          </Link>
        )}
      </div>

      {/* Store Info Badge */}
      {store && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2">
              <Store className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {store.subdomain ? getSubdomainUrl(store.subdomain) : "-"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="info">{store.subscriptionPlan}</Badge>
                {store.isVerified && <Badge variant="success">Verified</Badge>}
                {store.isFeatured && <Badge variant="warning">Featured</Badge>}
              </div>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500">Listing</p>
              <p className="text-sm font-bold text-gray-900">
                {store.usedPosts}/{store.postsLimit}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="max-w-2xl">{tabContent[activeTab]()}</div>
    </div>
  );
}
