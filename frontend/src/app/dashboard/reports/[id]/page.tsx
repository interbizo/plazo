"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { reportApi, type Report, type ReportMessage } from "@/services/report.service";
import {
  AlertCircle,
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useAuthStore } from "@/stores/auth.store";

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const { user } = useAuthStore();

  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReportDetail();
  }, [reportId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchReportDetail = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getReportMessages(reportId);
      setReport(response.data.data.report);
      setMessages(response.data.data.messages);
    } catch (error) {
      console.error("Failed to fetch report detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await reportApi.createReportMessage(reportId, {
        message: newMessage.trim(),
      });
      setMessages([...messages, response.data.data]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Gagal mengirim pesan. Silakan coba lagi.");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        label: "Menunggu",
        color: "bg-yellow-100 text-yellow-700",
        icon: Clock,
      },
      REVIEWING: {
        label: "Ditinjau",
        color: "bg-blue-100 text-blue-700",
        icon: AlertCircle,
      },
      RESOLVED: {
        label: "Selesai",
        color: "bg-green-100 text-green-700",
        icon: CheckCircle,
      },
      DISMISSED: {
        label: "Ditolak",
        color: "bg-gray-100 text-gray-700",
        icon: XCircle,
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4" />
        {config.label}
      </span>
    );
  };

  const getTargetTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      user: "Pengguna",
      product: "Produk",
      service: "Layanan",
      job: "Pekerjaan",
      review: "Ulasan",
      general: "Umum",
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Laporan tidak ditemukan
        </h3>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:text-blue-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(report.status)}
                <span className="text-sm text-gray-500">
                  {getTargetTypeLabel(report.targetType)}
                </span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">
                {report.reason}
              </h1>
              {report.description && (
                <p className="text-sm text-gray-600">{report.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t border-gray-200">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Dibuat {formatDistanceToNow(new Date(report.createdAt), {
                addSuffix: true,
                locale: idLocale,
              })}
            </span>
            {report.resolvedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Diselesaikan {formatDistanceToNow(new Date(report.resolvedAt), {
                  addSuffix: true,
                  locale: idLocale,
                })}
              </span>
            )}
          </div>

          {report.adminNotes && (
            <div className="mt-4 rounded-lg bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900 mb-1">
                Catatan Admin:
              </p>
              <p className="text-sm text-blue-700">{report.adminNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Pesan</h2>
          <p className="text-sm text-gray-500">
            Komunikasi dengan admin terkait laporan ini
          </p>
        </div>

        <div className="h-[500px] overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p className="text-sm">Belum ada pesan</p>
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.senderId === user?.id;
              const isAdminMessage = message.isAdmin;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <div className="shrink-0">
                    {message.sender.avatar ? (
                      <img
                        src={message.sender.avatar}
                        alt={message.sender.firstName}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isAdminMessage ? "bg-blue-100" : "bg-gray-100"
                      }`}>
                        <User className={`h-4 w-4 ${
                          isAdminMessage ? "text-blue-600" : "text-gray-600"
                        }`} />
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 max-w-[70%] ${isOwnMessage ? "items-end" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        isAdminMessage ? "text-blue-600" : "text-gray-900"
                      }`}>
                        {isAdminMessage && "Admin • "}
                        {message.sender.firstName} {message.sender.lastName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(message.createdAt), {
                          addSuffix: true,
                          locale: idLocale,
                        })}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-blue-600 text-white"
                          : isAdminMessage
                            ? "bg-blue-50 text-blue-900"
                            : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tulis pesan..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={sending || report.status === "RESOLVED" || report.status === "DISMISSED"}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending || report.status === "RESOLVED" || report.status === "DISMISSED"}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              Kirim
            </button>
          </form>
          {(report.status === "RESOLVED" || report.status === "DISMISSED") && (
            <p className="mt-2 text-xs text-gray-500">
              Laporan ini sudah ditutup. Anda tidak bisa mengirim pesan lagi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
