"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Save } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type LandingHero = {
  eyebrow: string;
  title: string;
  titleAccent: string;
  description: string;
  isPublished: boolean;
};

const defaultHero: LandingHero = {
  eyebrow: "Untuk bisnis produk dan jasa",
  title: "Buat toko.",
  titleAccent: "Beri bisnis Anda arah.",
  description: "Plazo menyatukan toko, katalog, dan percakapan pelanggan agar bisnis Anda hadir dengan lebih jelas sejak awal.",
  isPublished: true,
};

function readHero(data: unknown): LandingHero {
  const raw = data as { data?: Partial<LandingHero> } | Partial<LandingHero> | null;
  const hero = raw && "data" in raw && raw.data ? raw.data : raw;
  return { ...defaultHero, ...(hero || {}) };
}

export function LandingHeroManager() {
  const [hero, setHero] = useState<LandingHero>(defaultHero);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadHero = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await adminApi.getLandingHero();
      setHero(readHero(response.data));
    } catch {
      toast.error("Gagal memuat Hero landing page");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadHero(); }, [loadHero]);

  const updateField = <Key extends keyof LandingHero>(key: Key, value: LandingHero[Key]) => {
    setHero((current) => ({ ...current, [key]: value }));
  };

  const saveHero = async () => {
    setIsSaving(true);
    try {
      await adminApi.updateLandingHero(hero);
      toast.success("Hero landing page berhasil disimpan");
      await loadHero();
    } catch {
      toast.error("Gagal menyimpan Hero landing page");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-bold text-blue-950">Hero landing page</h2><p className="mt-1 text-xs leading-5 text-blue-800">Atur pesan utama yang pertama kali dilihat calon pemilik toko. Tombol CTA tetap menggunakan alur pendaftaran Plazo.</p></div>
        <Button size="sm" onClick={() => void saveHero()} isLoading={isSaving}><Save className="mr-1.5 h-4 w-4" /> Simpan Hero</Button>
      </div>

      <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <p className="text-sm font-bold text-gray-900">Konten Hero</p>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600"><input type="checkbox" checked={hero.isPublished} onChange={(event) => updateField("isPublished", event.target.checked)} />{hero.isPublished ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />} Tampilkan</label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Eyebrow" value={hero.eyebrow} onChange={(value) => updateField("eyebrow", value)} />
          <Field label="Judul baris pertama" value={hero.title} onChange={(value) => updateField("title", value)} />
          <Field label="Judul baris kedua" value={hero.titleAccent} onChange={(value) => updateField("titleAccent", value)} />
          <div className="md:col-span-2"><TextArea label="Deskripsi" value={hero.description} onChange={(value) => updateField("description", value)} /></div>
        </div>
      </article>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></label>;
}
