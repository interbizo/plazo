"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Boxes, Building2, Coffee, Cpu, Eye, EyeOff, FileText, Globe2, GraduationCap, GripVertical, Heart, MessageCircle, Music, PenTool, Plus, Save, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Trash2, Truck, Zap } from "lucide-react";
import { ReactSortable } from "react-sortablejs";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type LandingSectionHeading = { eyebrow: string; title: string; description: string };
type LandingSectionItem = { id: string; label?: string; title: string; description: string; icon?: string; tone?: string; sectionEyebrow?: string; sectionHeading?: string; sectionDescription?: string; sortOrder: number; isPublished: boolean };

export type LandingSectionConfig = {
  title: string;
  description: string;
  singular: string;
  sectionDefaults: LandingSectionHeading;
  get: () => Promise<{ data: unknown }>;
  create: (data: Record<string, unknown>) => Promise<{ data: unknown }>;
  update: (id: string, data: Record<string, unknown>) => Promise<{ data: unknown }>;
  remove: (id: string) => Promise<{ data: unknown }>;
  createItem: (sortOrder: number) => Record<string, unknown>;
  hasLabel?: boolean;
  hasIcon?: boolean;
  labelFieldLabel?: string;
  titleFieldLabel?: string;
  descriptionFieldLabel?: string;
};

const iconOptions = ["Store", "Boxes", "MessageCircle", "BarChart3", "Sparkles", "ShieldCheck", "ShoppingBag", "Building2", "Globe2", "Heart", "Star", "Zap", "Truck", "Coffee", "PenTool", "FileText", "GraduationCap", "Music", "Cpu"];
const iconMap = { BarChart3, Boxes, Building2, Coffee, Cpu, FileText, Globe2, GraduationCap, Heart, MessageCircle, Music, PenTool, ShieldCheck, ShoppingBag, Sparkles, Star, Store, Truck, Zap };

function readItems(data: unknown): LandingSectionItem[] {
  const raw = data as { data?: LandingSectionItem[] } | LandingSectionItem[];
  return Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
}

function readItem(data: unknown): LandingSectionItem {
  const raw = data as { data?: LandingSectionItem } | LandingSectionItem;
  return ("data" in raw && raw.data ? raw.data : raw) as LandingSectionItem;
}

export function LandingSectionManager({ config }: { config: LandingSectionConfig }) {
  const [items, setItems] = useState<LandingSectionItem[]>([]);
  const [sectionHeading, setSectionHeading] = useState<LandingSectionHeading>(config.sectionDefaults);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHeadingSaving, setIsHeadingSaving] = useState(false);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await config.get();
      const loadedItems = readItems(response.data);
      setItems(loadedItems);
      setSectionHeading({
        eyebrow: loadedItems[0]?.sectionEyebrow || config.sectionDefaults.eyebrow,
        title: loadedItems[0]?.sectionHeading || config.sectionDefaults.title,
        description: loadedItems[0]?.sectionDescription || config.sectionDefaults.description,
      });
    } catch {
      toast.error("Gagal memuat data " + config.title.toLowerCase());
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const orderedItems = useMemo(() => [...items].sort((left, right) => left.sortOrder - right.sortOrder), [items]);
  const updateItem = (id: string, field: keyof LandingSectionItem, value: string | boolean | number) => setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  const reorderItems = (nextItems: LandingSectionItem[]) => setItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));

  const saveSectionHeading = async () => {
    if (!items.length) {
      toast.error("Tambahkan " + config.singular + " terlebih dahulu untuk menyimpan judul section");
      return;
    }
    setIsHeadingSaving(true);
    try {
      const data = { sectionEyebrow: sectionHeading.eyebrow, sectionHeading: sectionHeading.title, sectionDescription: sectionHeading.description };
      await Promise.all(items.map((item) => config.update(item.id, data)));
      setItems((current) => current.map((item) => ({ ...item, ...data })));
      toast.success("Judul " + config.title.toLowerCase() + " berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan judul " + config.title.toLowerCase());
    } finally {
      setIsHeadingSaving(false);
    }
  };

  const saveItems = async () => {
    setIsSaving(true);
    try {
      await Promise.all(orderedItems.map((item, index) => config.update(item.id, { ...item, sortOrder: index })));
      toast.success(config.title + " berhasil disimpan");
      await loadItems();
    } catch {
      toast.error("Gagal menyimpan " + config.title.toLowerCase());
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = async () => {
    try {
      const response = await config.create({
        sectionEyebrow: sectionHeading.eyebrow,
        sectionHeading: sectionHeading.title,
        sectionDescription: sectionHeading.description,
        ...config.createItem(items.length),
      });
      setItems((current) => [...current, readItem(response.data)]);
      toast.success(config.singular + " ditambahkan");
    } catch {
      toast.error("Gagal menambahkan " + config.singular);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm(`Yakin hapus ${config.singular}?`)) return;
    try {
      await config.remove(id);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success(config.singular + " dihapus");
    } catch {
      toast.error("Gagal menghapus " + config.singular);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <section className="space-y-5">
      <article className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><h2 className="text-sm font-bold text-blue-950">Judul section {config.title}</h2><p className="mt-1 text-xs leading-5 text-blue-800">Konten ini tampil sebagai pengantar sebelum daftar {config.title.toLowerCase()} di landing page.</p></div>
          <Button size="sm" onClick={() => void saveSectionHeading()} isLoading={isHeadingSaving}><Save className="mr-1.5 h-4 w-4" /> Simpan judul</Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Label kecil" value={sectionHeading.eyebrow} onChange={(value) => setSectionHeading((current) => ({ ...current, eyebrow: value }))} />
          <Field label="Judul utama" value={sectionHeading.title} onChange={(value) => setSectionHeading((current) => ({ ...current, title: value }))} />
          <div className="md:col-span-2"><TextArea label="Deskripsi pengantar" value={sectionHeading.description} onChange={(value) => setSectionHeading((current) => ({ ...current, description: value }))} /></div>
        </div>
      </article>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-bold text-gray-900">Daftar {config.title}</h2><p className="mt-1 text-xs leading-5 text-gray-600">{config.description} Seret kartu untuk mengubah urutan.</p></div>
        <Button size="sm" onClick={() => void saveItems()} isLoading={isSaving}><Save className="mr-1.5 h-4 w-4" /> Simpan {config.title}</Button>
      </div>

      <ReactSortable list={orderedItems} setList={reorderItems} animation={180} handle=".landing-sort-handle" ghostClass="opacity-40" className="space-y-4">
        {orderedItems.map((item, index) => (
          <article key={item.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2"><span className="landing-sort-handle inline-flex cursor-grab touch-none text-gray-400 active:cursor-grabbing" title="Seret untuk mengubah urutan"><GripVertical className="h-5 w-5" /></span><p className="text-sm font-bold text-gray-900">{config.singular[0].toUpperCase() + config.singular.slice(1)} {index + 1}</p></div>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-600"><input type="checkbox" checked={item.isPublished} onChange={(event) => updateItem(item.id, "isPublished", event.target.checked)} />{item.isPublished ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-gray-400" />} Tampilkan</label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {config.hasLabel && <Field label={config.labelFieldLabel || "Label"} value={item.label || ""} onChange={(value) => updateItem(item.id, "label", value)} />}
              <Field label={config.titleFieldLabel || "Judul"} value={item.title} onChange={(value) => updateItem(item.id, "title", value)} />
              <div className="md:col-span-2"><TextArea label={config.descriptionFieldLabel || "Deskripsi"} value={item.description} onChange={(value) => updateItem(item.id, "description", value)} /></div>
              {config.hasIcon && <IconPicker value={item.icon || "Store"} onChange={(value) => updateItem(item.id, "icon", value)} />}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="danger" onClick={() => void deleteItem(item.id)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus</Button>
            </div>
          </article>
        ))}
      </ReactSortable>

      <Button size="sm" variant="outline" onClick={() => void addItem()}><Plus className="mr-1.5 h-4 w-4" /> Tambah {config.singular}</Button>
    </section>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></label>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></label>;
}

function IconPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <fieldset><legend className="mb-1 text-sm font-medium text-gray-700">Ikon</legend><div className="grid grid-cols-5 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 sm:grid-cols-7">{iconOptions.map((name) => { const Icon = iconMap[name as keyof typeof iconMap] || Sparkles; const isSelected = value === name; return <button key={name} type="button" title={name} aria-label={`Pilih ikon ${name}`} onClick={() => onChange(name)} className={`grid h-9 w-full place-items-center rounded-md transition ${isSelected ? "bg-blue-600 text-white shadow-sm" : "bg-white text-gray-500 hover:bg-blue-50 hover:text-blue-700"}`}><Icon className="h-4 w-4" /></button>; })}</div></fieldset>;
}
