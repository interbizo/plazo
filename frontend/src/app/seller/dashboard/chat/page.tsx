"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { chatApi } from "@/services/chat.service";
import { formatRelativeTime } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import {
  MessageSquare,
  Send,
  Search,
  ArrowLeft,
  ShoppingBag,
  CheckCheck,
  Check,
  Paperclip,
  X,
  Image as ImageIcon,
  Package,
  CheckCircle,
  Star,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { getSocket } from "@/lib/socket";
import { OnlineStatusBadge } from "@/components/shared/online-status-badge";
import { ReviewModal } from "@/components/chat/review-modal";
import toast from "react-hot-toast";
import axios from "axios";
import { tokenStorage } from "@/lib/api";

interface ChatParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: "BUYER" | "SELLER" | "ADMIN" | "SUPER_ADMIN";
  lastActiveAt?: string;
}

interface ChatLastMessage {
  text: string;
  createdAt: string;
}

interface ChatRoomItem {
  id: string;
  participants: ChatParticipant[];
  unreadCount?: number;
  lastMessage?: ChatLastMessage;
  order?: { title: string; status?: string };
}

interface ChatTransaction {
  id: string;
  contextType: string;
  contextId: string;
  contextTitle: string;
  variantName?: string;
  quantity?: number;
  packageTier?: string;
  packageTitle?: string;
  price?: number;
  status: "ONGOING" | "COMPLETED";
  completedAt?: string;
  completedBy?: string;
  reviewId?: string;
  createdAt: string;
}

interface ChatMessageItem {
  id: string;
  text: string;
  senderId: string;
  sender?: ChatParticipant;
  roomId?: string;
  chatRoomId?: string;
  createdAt: string;
  isRead?: boolean;
  _optimistic?: boolean;
  attachments?: string[];
  deliveryStatus?: "SENDING" | "SENT" | "DELIVERED" | "READ";
}

interface TypingData {
  userId: string;
  isTyping: boolean;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const initialRoom = searchParams.get("room") || "";

  const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
  const [activeRoomId, setActiveRoomId] = useState(initialRoom);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [text, setText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [transactions, setTransactions] = useState<ChatTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [completingTransaction, setCompletingTransaction] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ChatTransaction | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateRoomActivity = (
    roomId: string,
    message: Pick<ChatMessageItem, "text" | "createdAt">,
    unreadIncrement: number,
  ) => {
    setRooms((prev) => {
      const roomIndex = prev.findIndex((room) => room.id === roomId);
      if (roomIndex === -1) return prev;

      const room = prev[roomIndex];
      const updatedRoom: ChatRoomItem = {
        ...room,
        lastMessage: {
          text: message.text,
          createdAt: message.createdAt,
        },
        unreadCount:
          roomId === activeRoomId
            ? 0
            : Math.max(0, (room.unreadCount || 0) + unreadIncrement),
      };

      return [
        updatedRoom,
        ...prev.filter((item) => item.id !== roomId),
      ];
    });
  };

  const markRoomAsRead = async (roomId: string) => {
    try {
      const result = await chatApi.markRead(roomId);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("mark-as-read", {
          roomId,
          messageIds: result.data?.messageIds || [],
        });
      }
    } catch {
      // Non-critical: unread badge will recover on next refresh
    }
  };

  const getOtherParticipant = (room: ChatRoomItem) => {
    if (!room?.participants) return null;
    return (
      room.participants.find((p) => p.id !== user?.id) ||
      room.participants[0] ||
      null
    );
  };

  const getParticipantName = (p: ChatParticipant | null) => {
    if (!p) return "Pengguna";
    return [p.firstName, p.lastName].filter(Boolean).join(" ") || "Pengguna";
  };

  const getParticipantRoleLabel = (p: ChatParticipant | null) => {
    if (!p?.role) return "Pengguna";
    if (p.role === "SELLER") return "Seller";
    if (p.role === "BUYER") return "Buyer";
    if (p.role === "SUPER_ADMIN") return "Super Admin";
    return "Admin";
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data } = await chatApi.getRooms({ page: 1, limit: 50 });
        const list = data?.data || data || [];
        setRooms(list);
        if (!activeRoomId && list.length > 0) {
          setActiveRoomId(list[0].id);
        }
      } catch {
        // Silently fallback — user sees "no conversations" empty state
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await chatApi.getMessages(activeRoomId, {
          page: 1,
          limit: 100,
        });
        const msgs = (data?.data || data || []).map((msg: ChatMessageItem) => ({
          ...msg,
          deliveryStatus:
            msg.senderId === user?.id
              ? msg.isRead
                ? "READ"
                : "DELIVERED"
              : undefined,
        }));
        setMessages(msgs);
      } catch {
        toast.error("Gagal memuat pesan");
      } finally {
        setLoadingMessages(false);
      }
      void markRoomAsRead(activeRoomId);

      // Update unread count for this room
      setRooms((prev) =>
        prev.map((r) =>
          r.id === activeRoomId ? { ...r, unreadCount: 0 } : r,
        ),
      );
    };
    fetchMessages();

    // Fetch transactions for this room
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const { data } = await chatApi.getRoomTransactions(activeRoomId);
        setTransactions(data?.data || []);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
      } finally {
        setLoadingTransactions(false);
      }
    };
    fetchTransactions();
  }, [activeRoomId]);

  // Socket.IO — join rooms once
  const joinedRoomsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Only join rooms that haven't been joined yet
    rooms.forEach((room) => {
      if (!joinedRoomsRef.current.has(room.id)) {
        socket.emit("join-room", { roomId: room.id });
        joinedRoomsRef.current.add(room.id);
      }
    });
  }, [rooms]);

  // Socket.IO — message handlers
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (msg: ChatMessageItem) => {
      const roomId = msg.roomId || msg.chatRoomId;
      if (!roomId) return;
      if (msg.senderId === user?.id) return; // Skip own messages (already added optimistically)

      const incomingMessage: ChatMessageItem = {
        ...msg,
        deliveryStatus: msg.isRead ? "READ" : "DELIVERED",
      };

      if (roomId === activeRoomId) {
        setMessages((prev) =>
          prev.some((item) => item.id === incomingMessage.id)
            ? prev
            : [...prev, incomingMessage],
        );
        void markRoomAsRead(roomId);
        updateRoomActivity(roomId, incomingMessage, 0);
      } else {
        updateRoomActivity(roomId, incomingMessage, 1);
      }
    };

    const handleMessageSent = (payload: {
      clientTempId?: string;
      message: ChatMessageItem;
      deliveryStatus: "SENT" | "DELIVERED";
    }) => {
      setMessages((prev) =>
        prev.map((item) =>
          item.id === payload.clientTempId
            ? {
                ...payload.message,
                deliveryStatus: payload.deliveryStatus,
                _optimistic: false,
              }
            : item,
        ),
      );
      updateRoomActivity(payload.message.roomId || activeRoomId, payload.message, 0);
    };

    const handleMessagesRead = (payload: {
      roomId: string;
      userId: string;
      messageIds?: string[];
    }) => {
      if (payload.userId === user?.id || payload.roomId !== activeRoomId) return;

      setMessages((prev) =>
        prev.map((item) =>
          item.senderId === user?.id &&
          (!payload.messageIds?.length || payload.messageIds.includes(item.id))
            ? {
                ...item,
                isRead: true,
                deliveryStatus: "READ",
              }
            : item,
        ),
      );
    };

    const handleTyping = (data: TypingData) => {
      if (data.userId !== user?.id) {
        if (data.isTyping) {
          setTypingUser("Seseorang");
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
        } else {
          setTypingUser(null);
        }
      }
    };

    socket.on("new-message", handleNewMessage);
    socket.on("message-sent", handleMessageSent);
    socket.on("messages-read", handleMessagesRead);
    socket.on("user-typing", handleTyping);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("message-sent", handleMessageSent);
      socket.off("messages-read", handleMessagesRead);
      socket.off("user-typing", handleTyping);
      setTypingUser(null);
      // Clear typing timeout to prevent memory leak
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [activeRoomId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error(
        `Ukuran file terlalu besar. Maksimal 5MB. Ukuran file Anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`
      );
      return;
    }

    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Get API URL with fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      // Get token from tokenStorage (same as other API calls)
      const token = tokenStorage.getAccessToken();

      if (!token) {
        throw new Error("Tidak ada token autentikasi. Silakan login kembali.");
      }

      // Use axios instead of fetch to avoid Next.js Server Action issues
      // Don't set Content-Type header explicitly - let axios set it automatically with boundary
      const response = await axios.post(`${apiUrl}/api/upload/chat`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Axios automatically parses JSON
      if (response.data && response.data.file && response.data.file.url) {
        return response.data.file.url;
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);

      // Handle axios error
      let errorMessage = "Gagal mengupload file";
      if (axios.isAxiosError(error)) {
        errorMessage =
          (error.response?.data as { message?: string } | undefined)?.message ||
          error.message ||
          errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      return null;
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !selectedFile) || !activeRoomId) return;
    
    const messageText = text.trim() || (selectedFile ? "📎 File" : "");
    setText("");
    setSending(true);

    let attachmentUrl: string | null = null;

    // Upload file first if selected
    if (selectedFile) {
      setUploadingFile(true);
      attachmentUrl = await uploadFile(selectedFile);
      setUploadingFile(false);
      removeSelectedFile();

      if (!attachmentUrl) {
        setSending(false);
        return;
      }
    }

    // Optimistic add
    const optimisticMsg: ChatMessageItem = {
      id: `temp-${Date.now()}`,
      text: messageText,
      senderId: user?.id ?? "",
      sender: user ? { id: user.id, firstName: user.firstName, lastName: user.lastName, avatar: user.avatar } : undefined,
      createdAt: new Date().toISOString(),
      attachments: attachmentUrl ? [attachmentUrl] : undefined,
      _optimistic: true,
      deliveryStatus: "SENDING",
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("send-message", {
          roomId: activeRoomId,
          text: messageText,
          attachments: attachmentUrl ? [attachmentUrl] : undefined,
          clientTempId: optimisticMsg.id,
        });
      } else {
        const { data } = await chatApi.sendMessage({
          roomId: activeRoomId,
          text: messageText,
          attachments: attachmentUrl ? [attachmentUrl] : undefined,
        });
        // Replace optimistic message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...data, deliveryStatus: "SENT" }
              : m,
          ),
        );
      }
      updateRoomActivity(activeRoomId, optimisticMsg, 0);
      inputRef.current?.focus();
    } catch (err: unknown) {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      const errorMsg =
        err instanceof Error ? err.message : "Gagal mengirim pesan";
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || errorMsg,
      );
    } finally {
      setSending(false);
    }
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (socket?.connected && activeRoomId) {
      socket.emit("typing", { roomId: activeRoomId, isTyping: true });
    }
  };

  const selectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setShowMobileChat(true);
  };

  const handleCompleteTransaction = async (transactionId: string) => {
    if (!confirm("Apakah Anda yakin ingin menandai transaksi ini sebagai selesai?")) {
      return;
    }

    setCompletingTransaction(transactionId);
    try {
      await chatApi.markTransactionComplete(transactionId);
      toast.success("Transaksi berhasil ditandai selesai");
      
      // Refresh transactions
      if (activeRoomId) {
        const { data } = await chatApi.getRoomTransactions(activeRoomId);
        setTransactions(data?.data || []);
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Gagal menandai transaksi selesai";
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || errorMsg
      );
    } finally {
      setCompletingTransaction(null);
    }
  };

  const handleOpenReviewModal = (transaction: ChatTransaction) => {
    setSelectedTransaction(transaction);
    setReviewModalOpen(true);
  };

  const handleReviewSuccess = async () => {
    // Refresh transactions to update reviewId
    if (activeRoomId) {
      const { data } = await chatApi.getRoomTransactions(activeRoomId);
      setTransactions(data?.data || []);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  const filteredRooms = searchQuery
    ? rooms.filter((room) => {
        const other = getOtherParticipant(room);
        const name = getParticipantName(other).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : rooms;

  if (loadingRooms) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="-mx-4 -my-6 flex flex-col h-screen overflow-hidden">
      <div className="flex flex-1 min-h-0 bg-white">
        {/* Room list - hidden on mobile when chat is active */}
        <div
          className={`w-full md:w-80 shrink-0 border-r border-gray-200 flex flex-col ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari percakapan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-blue-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Room list */}
          <div className="flex-1 overflow-y-auto">
            {filteredRooms.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? "Tidak ada hasil" : "Belum ada percakapan"}
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const other = getOtherParticipant(room);
                const isActive = activeRoomId === room.id;
                const unread = room.unreadCount || 0;
                const lastMsg = room.lastMessage;

                return (
                  <button
                    key={room.id}
                    onClick={() => selectRoom(room.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all ${
                      isActive
                        ? "bg-blue-50 border-l-2 border-l-blue-500"
                        : "border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar
                          src={other?.avatar}
                          firstName={other?.firstName || "?"}
                          lastName={other?.lastName || ""}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm truncate ${
                              unread > 0
                                ? "font-semibold text-gray-900"
                                : "font-medium text-gray-700"
                            }`}
                            >
                              {getParticipantName(other)}
                            </p>
                          {lastMsg?.createdAt && (
                            <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                              {formatRelativeTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            {getParticipantRoleLabel(other)}
                          </span>
                          <OnlineStatusBadge
                            lastActiveAt={other?.lastActiveAt || null}
                            showText
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p
                            className={`text-xs truncate ${
                              unread > 0 ? "text-gray-700" : "text-gray-500"
                            }`}
                          >
                            {lastMsg?.text || "Belum ada pesan"}
                          </p>
                          {unread > 0 && (
                            <span className="shrink-0 ml-2 bg-blue-500 text-white text-[10px] font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                        {room.order && (
                          <div className="flex items-center gap-1 mt-1">
                            <ShoppingBag className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-gray-400 truncate">
                              {room.order.title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Messages area */}
        <div
          className={`flex-1 flex flex-col ${
            !showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {!activeRoomId ? (
            <div className="flex-1 flex items-center justify-center bg-gray-50/50">
              <EmptyState
                icon={<MessageSquare className="h-12 w-12 text-gray-300" />}
                title="Pilih percakapan"
                description="Pilih percakapan di sebelah kiri untuk mulai chat."
              />
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1 -ml-1 rounded-lg hover:bg-gray-100"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  {activeRoom && (
                    <>
                      <Avatar
                        src={getOtherParticipant(activeRoom)?.avatar}
                        firstName={
                          getOtherParticipant(activeRoom)?.firstName || "?"
                        }
                        lastName={getOtherParticipant(activeRoom)?.lastName || ""}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {getParticipantName(getOtherParticipant(activeRoom))}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                            {getParticipantRoleLabel(getOtherParticipant(activeRoom))}
                          </span>
                          <OnlineStatusBadge
                            lastActiveAt={getOtherParticipant(activeRoom)?.lastActiveAt || null}
                            showText
                            size="sm"
                          />
                        </div>
                        {activeRoom.order && (
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {activeRoom.order.title} &middot;{" "}
                            <span className="capitalize">
                              {activeRoom.order.status?.toLowerCase()}
                            </span>
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Transactions Section - Only show ONGOING or COMPLETED without review */}
                {transactions.filter(t => t.status === "ONGOING" || (t.status === "COMPLETED" && !t.reviewId)).length > 0 && (
                  <div className="mt-3 space-y-2">
                    {transactions.filter(t => t.status === "ONGOING" || (t.status === "COMPLETED" && !t.reviewId)).map((transaction) => (
                      <div
                        key={transaction.id}
                        className={`p-3 rounded-lg border ${
                          transaction.status === "COMPLETED"
                            ? "bg-green-50 border-green-200"
                            : "bg-blue-50 border-blue-200"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Package className={`h-4 w-4 mt-0.5 shrink-0 ${
                              transaction.status === "COMPLETED" ? "text-green-600" : "text-blue-600"
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${
                                transaction.status === "COMPLETED" ? "text-green-900" : "text-blue-900"
                              }`}>
                                {transaction.contextTitle}
                              </p>
                              {transaction.variantName && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Varian: {transaction.variantName}
                                </p>
                              )}
                              {transaction.packageTier && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Paket: {transaction.packageTitle || transaction.packageTier}
                                </p>
                              )}
                              {transaction.quantity && (
                                <p className="text-xs text-gray-600 mt-0.5">
                                  Jumlah: {transaction.quantity}
                                </p>
                              )}
                              {transaction.price && (
                                <p className="text-xs font-medium text-gray-700 mt-1">
                                  Rp {transaction.price.toLocaleString("id-ID")}
                                </p>
                              )}
                              {transaction.status === "COMPLETED" && transaction.completedAt && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  Selesai {formatRelativeTime(transaction.completedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Seller or Admin can mark as complete */}
                          {transaction.status === "ONGOING" && user?.role && (["ADMIN", "SUPER_ADMIN"].includes(user.role) || user.role === "SELLER") && (
                            <Button
                              size="sm"
                              onClick={() => handleCompleteTransaction(transaction.id)}
                              disabled={completingTransaction === transaction.id}
                              isLoading={completingTransaction === transaction.id}
                              className="shrink-0 text-xs"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Tandai Selesai
                            </Button>
                          )}
                          {/* Buyer can review after completed */}
                          {transaction.status === "COMPLETED" && !transaction.reviewId && user?.role === "BUYER" && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenReviewModal(transaction)}
                              className="shrink-0 text-xs bg-yellow-500 hover:bg-yellow-600"
                            >
                              <Star className="h-3 w-3 mr-1" />
                              Beri Testimoni
                            </Button>
                          )}
                          {/* Show reviewed badge */}
                          {transaction.status === "COMPLETED" && transaction.reviewId && (
                            <div className="shrink-0 flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                              <Star className="h-3 w-3 fill-current" />
                              Sudah Direview
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50/30">
                {loadingMessages ? (
                  <div className="flex justify-center py-10">
                    <Spinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Belum ada pesan</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Kirim pesan pertama Anda
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => {
                      const isMine =
                        msg.senderId === user?.id ||
                        msg.sender?.id === user?.id;
                      const showAvatar =
                        !isMine &&
                        (idx === 0 ||
                          messages[idx - 1]?.senderId !== msg.senderId);

                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} ${
                            showAvatar ? "mt-3" : "mt-0.5"
                          }`}
                        >
                          {!isMine && (
                            <div className="w-6 shrink-0">
                              {showAvatar && (
                                <Avatar
                                  src={msg.sender?.avatar}
                                  firstName={msg.sender?.firstName || "?"}
                                  lastName={msg.sender?.lastName || ""}
                                  size="sm"
                                  className="h-6! w-6! text-[10px]!"
                                />
                              )}
                            </div>
                          )}
                          <div
                            className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                              isMine
                                ? "bg-blue-500 text-white rounded-br-md"
                                : "bg-white text-gray-900 rounded-bl-md border border-gray-100"
                            }`}
                          >
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mb-2">
                                {msg.attachments.map((url, i) => {
                                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                  return (
                                    <div key={i} className="mb-1">
                                      {isImage ? (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={url}
                                            alt="Attachment"
                                            className="max-w-full rounded-lg"
                                            style={{ maxHeight: "200px" }}
                                          />
                                        </a>
                                      ) : (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                            isMine
                                              ? "bg-blue-600 hover:bg-blue-700"
                                              : "bg-gray-100 hover:bg-gray-200"
                                          }`}
                                        >
                                          <Paperclip className="h-4 w-4" />
                                          <span className="text-xs">File</span>
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <p className="whitespace-pre-wrap wrap-break-word">
                              {msg.text}
                            </p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 ${
                                isMine ? "text-blue-200" : "text-gray-400"
                              }`}
                            >
                              <span className="text-[10px]">
                                {formatRelativeTime(msg.createdAt)}
                              </span>
                              {isMine && (
                                <>
                                  <span className="text-[10px]">
                                    {msg.deliveryStatus === "SENDING"
                                      ? "Mengirim"
                                      : msg.isRead || msg.deliveryStatus === "READ"
                                        ? "Dibaca"
                                        : msg.deliveryStatus === "DELIVERED"
                                          ? "Diterima"
                                          : "Terkirim"}
                                  </span>
                                  {msg.isRead || msg.deliveryStatus === "READ" ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Typing indicator + Input */}
              <div className="border-t border-gray-200 bg-white">
                {typingUser && (
                  <div className="px-4 pt-2">
                    <p className="text-xs text-gray-400 animate-pulse flex items-center gap-1">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                      {typingUser} sedang mengetik...
                    </p>
                  </div>
                )}
                
                {/* File preview */}
                {selectedFile && (
                  <div className="px-4 pt-2">
                    <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <ImageIcon className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-900 flex-1 truncate">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)}KB)
                      </span>
                      <button
                        type="button"
                        onClick={removeSelectedFile}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2 p-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile || sending}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                    title="Upload file (max 5MB)"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      emitTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ketik pesan..."
                    disabled={uploadingFile}
                    className="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-colors disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={(!text.trim() && !selectedFile) || sending || uploadingFile}
                    isLoading={sending || uploadingFile}
                    className="rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedTransaction && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
