"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { adminApi } from "@/services/admin.service";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Flag, Send, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";

interface Report {
  id: string;
  reason?: string;
  type?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  reporter?: { 
    id?: string;
    firstName?: string; 
    lastName?: string;
    avatar?: string;
  };
  targetUser?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
  _count?: {
    messages?: number;
  };
}

interface Message {
  id: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
  };
}

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const page = Number(searchParams.get("page") || "1");

  // Initialize Socket.io
  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("plazo_access_token");
    if (!token) {
      console.warn("No token found for socket connection");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    socketRef.current = io(`${apiUrl}/reports`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected to reports namespace");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    socketRef.current.on("newMessage", (message: Message) => {
      console.log("New message received:", message);
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
      scrollToBottom();
    });

    socketRef.current.on("reportStatusChanged", ({ reportId, status }) => {
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) => prev ? { ...prev, status } : null);
      }
      fetchReports();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedReport]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getReports({ page });
      setReports(data.data || []);
    } catch {
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page]);

  const loadMessages = async (reportId: string) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("plazo_access_token");
      
      if (!token) {
        toast.error("Token tidak ditemukan. Silakan login kembali.");
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(
        `${apiUrl}/api/reports/${reportId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
          // Optionally redirect to login
          // window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const messages = result?.data?.messages || result?.messages || [];
      setMessages(messages);
      
      // Join socket room for this report
      if (socketRef.current) {
        socketRef.current.emit("joinReport", { reportId });
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast.error("Gagal memuat pesan");
    }
  };

  const handleSelectReport = async (report: Report) => {
    setSelectedReport(report);
    await loadMessages(report.id);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedReport || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX
    
    try {
      // Use socket.io to send message
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit(
          "sendMessage",
          {
            reportId: selectedReport.id,
            message: messageText,
          },
          (response: any) => {
            if (!response.success) {
              toast.error(response.error || "Gagal mengirim pesan");
              setNewMessage(messageText); // Restore on error
            }
          }
        );
      } else {
        // Fallback to HTTP if socket not connected
        console.warn("Socket not connected, using HTTP fallback");
        const response = await api.post(`/api/reports/${selectedReport.id}/messages`, {
          message: messageText,
        });
        
        const newMsg = response.data.data || response.data;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
      scrollToBottom();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Gagal mengirim pesan");
      setNewMessage(messageText); // Restore on error
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveReport = async (action: "resolve" | "dismiss") => {
    if (!selectedReport) return;

    try {
      await adminApi.resolveReport(selectedReport.id, {
        action,
        adminNotes: `Report ${action}d by admin`,
      });
      toast.success(`Laporan ${action === "resolve" ? "diselesaikan" : "ditolak"}`);
      setSelectedReport(null);
      fetchReports();
    } catch {
      toast.error("Gagal");
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "RESOLVED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "DISMISSED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "RESOLVED":
        return "success";
      case "DISMISSED":
        return "destructive";
      default:
        return "warning";
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Laporan & Chat</h1>
        <p className="text-sm text-gray-500">Kelola laporan dengan sistem chat real-time</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 h-[calc(100%-5rem)]">
          {/* Reports List */}
          <div className="col-span-4 border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900">Daftar Laporan</h2>
              <p className="text-xs text-gray-500 mt-0.5">{reports.length} laporan</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {reports.length === 0 ? (
                <EmptyState
                  icon={<Flag className="h-12 w-12 text-gray-300" />}
                  title="Tidak ada laporan"
                  description=""
                />
              ) : (
                <div className="divide-y divide-gray-100">
                  {reports.map((report) => (
                    <button
                      key={report.id}
                      onClick={() => handleSelectReport(report)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedReport?.id === report.id ? "bg-indigo-50 border-l-4 border-indigo-600" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(report.status)}
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {report.reason || report.type}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {report.reporter?.firstName} {report.reporter?.lastName}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <MessageSquare className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {report._count?.messages || 0} pesan
                            </span>
                          </div>
                        </div>
                        <Badge variant={getStatusColor(report.status) as any} className="text-xs">
                          {report.status || "PENDING"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-8 border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col">
            {selectedReport ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedReport.reason}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Dilaporkan oleh {selectedReport.reporter?.firstName} {selectedReport.reporter?.lastName}
                        {selectedReport.targetUser && (
                          <> • Target: {selectedReport.targetUser.firstName} {selectedReport.targetUser.lastName}</>
                        )}
                      </p>
                    </div>
                    {selectedReport.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveReport("resolve")}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                        >
                          Selesaikan
                        </button>
                        <button
                          onClick={() => handleResolveReport("dismiss")}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.isAdmin
                            ? "bg-indigo-600 text-white"
                            : "bg-white border border-gray-200 text-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`text-xs font-medium ${msg.isAdmin ? "text-indigo-100" : "text-gray-600"}`}>
                            {msg.sender.firstName} {msg.sender.lastName}
                            {msg.isAdmin && " (Admin)"}
                          </p>
                        </div>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.isAdmin ? "text-indigo-200" : "text-gray-400"}`}>
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                {selectedReport.status === "PENDING" && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Ketik pesan..."
                        disabled={isSending}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSending ? (
                          <Spinner className="h-5 w-5" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<MessageSquare className="h-16 w-16 text-gray-300" />}
                  title="Pilih laporan untuk memulai chat"
                  description="Klik salah satu laporan di sebelah kiri"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
