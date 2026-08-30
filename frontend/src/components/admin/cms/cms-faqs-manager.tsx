"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { HelpCircle, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeHtml } from "@/components/ui/safe-html";
import { Spinner } from "@/components/ui/spinner";

interface FaqItem {
  id: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
}

// ============ CMS FAQS ============

export function CmsFaqsManager() {
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

