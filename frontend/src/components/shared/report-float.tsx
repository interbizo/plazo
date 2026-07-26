"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { Flag, AlertCircle, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

const reportTypes = [
  { value: "BUG", label: "Bug/Error", icon: AlertCircle, description: "Laporkan bug atau error sistem" },
  { value: "ABUSE", label: "Penyalahgunaan", icon: Flag, description: "Laporkan penyalahgunaan platform" },
  { value: "SPAM", label: "Spam", icon: Flag, description: "Laporkan konten spam" },
  { value: "INAPPROPRIATE", label: "Konten Tidak Pantas", icon: Flag, description: "Laporkan konten tidak pantas" },
  { value: "SCAM", label: "Penipuan", icon: Flag, description: "Laporkan dugaan penipuan" },
  { value: "OTHER", label: "Lainnya", icon: MessageCircle, description: "Laporan lainnya" },
];

export function ReportFloat() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (submittingRef.current || isSubmitting) {
      return;
    }

    if (!user) {
      toast.error("Silakan login terlebih dahulu");
      router.push("/login");
      return;
    }

    if (!selectedType) {
      toast.error("Pilih jenis laporan");
      return;
    }

    if (!description.trim()) {
      toast.error("Deskripsi tidak boleh kosong");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/reports", {
        targetType: "GENERAL",
        targetId: "GENERAL",
        reason: reportTypes.find((t) => t.value === selectedType)?.label || selectedType,
        description: description.trim(),
      });

      console.log("Report response:", response.data);

      // Get report ID from response
      const reportId = response.data?.data?.report?.id || response.data?.report?.id;
      
      if (!reportId) {
        throw new Error("Report ID not found in response");
      }

      toast.success("Laporan berhasil dikirim");
      
      // Reset form before redirect
      setIsOpen(false);
      setSelectedType("");
      setDescription("");
      
      // Redirect to chat page
      router.push(`/reports/${reportId}`);
      
    } catch (error: any) {
      console.error("Submit report error:", error);
      toast.error(error.response?.data?.message || "Gagal mengirim laporan");
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Laporkan Masalah"
      >
        <Flag className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-[55]"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal */}
      <div className="fixed bottom-6 right-6 z-[60] w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
      {/* Header */}
      <div className="bg-red-600 text-white p-4 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="w-5 h-5" />
          <h3 className="font-semibold">Laporkan Masalah</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="hover:bg-red-700 rounded p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <p className="font-medium">Login Diperlukan</p>
            <p className="text-xs mt-1">Anda harus login untuk membuat laporan</p>
          </div>
        )}

        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jenis Laporan
          </label>
          <div className="grid grid-cols-2 gap-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    selectedType === type.value
                      ? "border-red-600 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${selectedType === type.value ? "text-red-600" : "text-gray-600"}`} />
                  <p className={`text-sm font-medium ${selectedType === type.value ? "text-red-600" : "text-gray-900"}`}>
                    {type.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan masalah Anda secara detail..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            disabled={!user}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !user || !selectedType || !description.trim()}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {isSubmitting ? "Mengirim..." : "Kirim Laporan"}
        </button>
      </form>
    </div>
    </>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
