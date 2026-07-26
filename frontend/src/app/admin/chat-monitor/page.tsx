"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, Eye, Search, Filter } from "lucide-react";

interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
}

interface ChatRoom {
  id: string;
  tenantId: string;
  isAdminChat: boolean;
  contextType?: string;
  contextTitle?: string;
  participants: ChatParticipant[];
  messages: Array<{
    id: string;
    text: string;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  }>;
  _count?: {
    messages: number;
  };
  updatedAt: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
}

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  isRead: boolean;
  createdAt: string;
}

function ChatMonitorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "admin" | "regular">("all");
  const page = Number(searchParams.get("page") || "1");

  useEffect(() => {
    fetchRooms();
  }, [page, filterType]);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      // Fetch all chat rooms (not just admin chats)
      const { data } = await api.get("/api/chat/rooms", { 
        params: { page, limit: 20 } 
      });
      
      let filteredRooms = data.data || [];
      
      // Apply filter
      if (filterType === "admin") {
        filteredRooms = filteredRooms.filter((room: ChatRoom) => room.isAdminChat);
      } else if (filterType === "regular") {
        filteredRooms = filteredRooms.filter((room: ChatRoom) => !room.isAdminChat);
      }
      
      setRooms(filteredRooms);
      setTotal(data.total || 0);
      setTotalPages(data.pages || 0);
    } catch (error) {
      console.error("Failed to fetch chat rooms:", error);
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateURL = (params: Record<string, string>) => {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/admin/chat-monitor?${sp.toString()}`, { scroll: false });
  };

  const viewMessages = async (roomId: string) => {
    if (selectedRoom === roomId) {
      setSelectedRoom(null);
      return;
    }
    setSelectedRoom(roomId);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/api/chat/room/${roomId}/messages`, {
        params: { limit: 50 },
      });
      setMessages(data.data || []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const getParticipantNames = (room: ChatRoom) => {
    return room.participants
      .map((p) => `${p.firstName} ${p.lastName}`)
      .join(" ↔ ");
  };

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      getParticipantNames(room).toLowerCase().includes(query) ||
      room.tenant.name.toLowerCase().includes(query) ||
      room.contextTitle?.toLowerCase().includes(query)
    );
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Chat Monitor</h1>
        <p className="text-sm text-gray-500">
          Monitor semua percakapan untuk moderasi konten
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, toko, atau produk..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterType === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType("admin")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterType === "admin"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Admin Chat
          </button>
          <button
            onClick={() => setFilterType("regular")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filterType === "regular"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            User Chat
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-12 w-12 text-gray-300" />}
          title="Tidak ada chat room"
          description={searchQuery ? "Coba kata kunci lain" : ""}
        />
      ) : (
        <>
          <div className="space-y-3">
            {filteredRooms.map((room) => {
              const lastMessage = room.messages?.[0];
              const isAdminChat = room.isAdminChat;

              return (
                <div
                  key={room.id}
                  className={`rounded-xl border bg-white ${
                    isAdminChat
                      ? "border-indigo-200 bg-indigo-50/30"
                      : "border-gray-200"
                  }`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {getParticipantNames(room)}
                          </p>
                          {isAdminChat && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              <MessageSquare className="h-3 w-3" />
                              Admin Chat
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">
                          Toko: {room.tenant.name} ({room.tenant.subdomain})
                        </p>
                        {room.contextTitle && (
                          <p className="text-xs text-gray-500 mb-1">
                            Konteks: {room.contextTitle}
                          </p>
                        )}
                        {lastMessage && (
                          <p className="text-xs text-gray-600 truncate">
                            Pesan terakhir: {lastMessage.text}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {room._count?.messages || 0} pesan •{" "}
                          {formatDate(room.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => viewMessages(room.id)}
                        className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {selectedRoom === room.id ? "Tutup" : "Lihat"}
                      </button>
                    </div>
                  </div>
                  {selectedRoom === room.id && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 max-h-96 overflow-y-auto">
                      {loadingMessages ? (
                        <div className="flex justify-center py-4">
                          <Spinner />
                        </div>
                      ) : messages.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">
                          Tidak ada pesan
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className="rounded-lg p-3 bg-white border border-gray-200"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-700">
                                  {msg.sender.firstName} {msg.sender.lastName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {new Date(msg.createdAt).toLocaleString(
                                    "id-ID",
                                    {
                                      day: "2-digit",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                {msg.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) => updateURL({ page: String(p) })}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function ChatMonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ChatMonitorContent />
    </Suspense>
  );
}
