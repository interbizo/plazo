"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { io, Socket } from "socket.io-client";
import { Send, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface Message {
  id: string;
  message: string;
  senderId: string;
  isAdmin: boolean;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

interface Report {
  id: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export default function ReportChatPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;
  const user = useAuthStore((s) => s.user);

  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    loadReportData();
    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [reportId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadReportData = async () => {
    try {
      setError(null);
      
      const [reportRes, messagesRes] = await Promise.all([
        api.get(`/api/reports/${reportId}`),
        api.get(`/api/reports/${reportId}/messages`),
      ]);

      console.log("Report response:", reportRes.data);
      console.log("Messages response:", messagesRes.data);

      // Handle different response structures
      const reportData = reportRes.data?.data || reportRes.data;
      const messagesData = messagesRes.data?.data || messagesRes.data;

      if (!reportData || !reportData.id) {
        throw new Error("Invalid report data");
      }

      setReport(reportData);
      setMessages(messagesData.messages || messagesData || []);
    } catch (error: any) {
      console.error("Load report error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Gagal memuat data laporan";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeSocket = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const token = typeof window !== "undefined" ? localStorage.getItem("plazo_access_token") : null;

    if (!token) {
      console.error("No token found for socket connection");
      return;
    }

    console.log("Connecting to socket:", `${backendUrl}/reports`);

    const newSocket = io(`${backendUrl}/reports`, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      newSocket.emit("joinReport", { reportId });
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    newSocket.on("newMessage", (message: Message) => {
      console.log("New message received:", message);
      setMessages((prev) => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    newSocket.on("userTyping", ({ userId, isTyping: typing }: { userId: string; isTyping: boolean }) => {
      if (userId !== user?.id) {
        setIsTyping(typing);
      }
    });

    newSocket.on("reportStatusChanged", ({ status }: { status: string }) => {
      setReport((prev) => (prev ? { ...prev, status } : null));
      toast.success(`Status laporan diubah menjadi ${status}`);
    });

    setSocket(newSocket);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      if (socket && socket.connected) {
        // Send via socket - message will be added via 'newMessage' event
        socket.emit("sendMessage", {
          reportId,
          message: messageText,
        });
      } else {
        // Fallback to HTTP if socket not connected
        console.warn("Socket not connected, using HTTP fallback");
        const response = await api.post(`/api/reports/${reportId}/messages`, {
          message: messageText,
        });
        
        const newMsg = response.data.data || response.data;
        setMessages((prev) => {
          // Prevent duplicate
          if (prev.some(m => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    } catch (error: any) {
      console.error("Send message error:", error);
      toast.error(error.response?.data?.message || "Gagal mengirim pesan");
      setNewMessage(messageText); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = () => {
    if (socket && socket.connected) {
      socket.emit("typing", { reportId, isTyping: true });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit("typing", { reportId, isTyping: false });
      }, 1000);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
      PENDING: { label: "Menunggu", color: "bg-yellow-100 text-yellow-800", icon: Clock },
      REVIEWING: { label: "Ditinjau", color: "bg-blue-100 text-blue-800", icon: Clock },
      RESOLVED: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
      DISMISSED: { label: "Ditolak", color: "bg-red-100 text-red-800", icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Oops! Terjadi Kesalahan
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "Laporan tidak ditemukan"}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                loadReportData();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => router.push("/reports/my-reports")}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/reports/my-reports")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">{report.reason}</h1>
                <p className="text-sm text-gray-600">ID: {report.id.slice(0, 8)}</p>
              </div>
            </div>
            {getStatusBadge(report.status)}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-200px)]">
          {/* Report Info */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">{report.description}</p>
            <p className="text-xs text-gray-500 mt-2">
              Dibuat pada {new Date(report.createdAt).toLocaleString("id-ID")}
            </p>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>Belum ada pesan</p>
                <p className="text-sm mt-1">Mulai percakapan dengan mengirim pesan</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwnMessage = msg.senderId === user?.id;
                const isAdminMessage = msg.isAdmin;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[70%] ${isOwnMessage ? "order-2" : "order-1"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {!isOwnMessage && (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium">
                            {msg.sender.firstName[0]}
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {isOwnMessage ? "Anda" : `${msg.sender.firstName} ${msg.sender.lastName}`}
                            {isAdminMessage && (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                Admin
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isOwnMessage
                            ? "bg-red-600 text-white"
                            : isAdminMessage
                            ? "bg-blue-100 text-blue-900"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                </div>
                <span>Sedang mengetik...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {report.status === "PENDING" || report.status === "REVIEWING" ? (
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Ketik pesan..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isSending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Kirim
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
              Laporan ini sudah {report.status === "RESOLVED" ? "diselesaikan" : "ditutup"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
