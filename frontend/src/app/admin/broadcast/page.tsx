"use client";

import { useState } from "react";
import { adminApi } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { Megaphone } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminBroadcastPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Judul dan pesan wajib diisi");
      return;
    }
    setIsSending(true);
    try {
      await adminApi.broadcast({
        title,
        message,
        targetRole: targetRole || undefined,
      });
      toast.success("Broadcast terkirim!");
      setTitle("");
      setMessage("");
      setTargetRole("");
    } catch {
      toast.error("Gagal mengirim broadcast");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Megaphone className="h-5 w-5" /> Broadcast Notifikasi
      </h1>

      <div className="max-w-lg rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Judul
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul notifikasi"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pesan
          </label>
          <CKEditor4
            value={message}
            onChange={setMessage}
            placeholder="Tulis pesan broadcast di sini..."
            minHeight="250px"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target (opsional)
          </label>
          <select
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
          >
            <option value="">Semua Pengguna</option>
            <option value="BUYER">Buyer</option>
            <option value="SELLER">Seller</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <Button onClick={handleSend} isLoading={isSending} className="w-full">
          Kirim Broadcast
        </Button>
      </div>
    </div>
  );
}
