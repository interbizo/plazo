import { Injectable, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { OpenChatRoomDto, SendMessageDto } from "./chat.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationEventsService))
    private notificationEvents: NotificationEventsService,
  ) {}

  /**
   * Build template pesan otomatis berdasarkan konteks item
   * Template berisi detail lengkap produk/jasa/lowongan
   */
  private buildContextMessage(dto: OpenChatRoomDto): string {
    const formatPrice = (price: number) =>
      `Rp ${price.toLocaleString("id-ID")}`;

    // === PRODUK ===
    if (dto.productId) {
      const lines: string[] = [
        `📦 *Saya tertarik dengan produk ini:*`,
        ``,
        `🏷️ *${dto.itemTitle || "Produk"}*`,
      ];

      if (dto.variantName) {
        lines.push(`📋 Varian: ${dto.variantName}`);
      }

      if (dto.price != null) {
        lines.push(`💰 Harga: ${formatPrice(dto.price)}`);
      }

      if (dto.quantity && dto.quantity > 1) {
        lines.push(`🔢 Jumlah: ${dto.quantity}`);
        if (dto.price != null) {
          lines.push(`💵 Total: ${formatPrice(dto.price * dto.quantity)}`);
        }
      }

      lines.push(``);
      lines.push(`Mohon informasi lebih lanjut mengenai produk ini. Terima kasih! 🙏`);

      return lines.join("\n");
    }

    // === JASA / LAYANAN ===
    if (dto.serviceId) {
      const lines: string[] = [
        `🛠️ *Saya tertarik dengan layanan ini:*`,
        ``,
        `🏷️ *${dto.itemTitle || "Layanan"}*`,
      ];

      if (dto.packageTitle || dto.packageTier) {
        lines.push(`📋 Paket: ${dto.packageTitle || dto.packageTier}`);
      }

      if (dto.packageDescription) {
        lines.push(`📝 Detail: ${dto.packageDescription}`);
      }

      if (dto.packagePrice != null) {
        lines.push(`💰 Harga Paket: ${formatPrice(dto.packagePrice)}`);
      }

      lines.push(``);
      lines.push(`Mohon informasi lebih lanjut mengenai layanan ini. Terima kasih! 🙏`);

      return lines.join("\n");
    }

    // === LOWONGAN ===
    if (dto.jobId) {
      const lines: string[] = [
        `💼 *Saya tertarik dengan lowongan ini:*`,
        ``,
        `🏷️ *${dto.itemTitle || "Lowongan"}*`,
      ];

      if (dto.price != null) {
        lines.push(`💰 Budget: ${formatPrice(dto.price)}`);
      }

      lines.push(``);
      lines.push(`Saya ingin berdiskusi lebih lanjut mengenai lowongan ini. Terima kasih! 🙏`);

      return lines.join("\n");
    }

    return "Halo, saya ingin berdiskusi lebih lanjut.";
  }

  /**
   * Open or create chat room
   * 
   * RULES:
   * - Jika room sudah ada antara buyer-seller di tenant yang sama → gunakan room lama
   * - Jika room belum ada → buat room baru
   * - SELALU kirim pesan template berisi detail item yang dipilih (baik room baru maupun lama)
   * - Konteks item (productId/serviceId/jobId) disimpan di pesan, bukan di room
   */
  async openOrCreateRoom(userId: string, dto: OpenChatRoomDto) {
    if (userId === dto.targetUserId) {
      throw new BadRequestException("Tidak bisa membuka chat dengan akun sendiri");
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { id: dto.tenantId, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!tenant) {
      throw new BadRequestException("Toko tidak ditemukan");
    }

    const participants = await this.prisma.user.findMany({
      where: {
        id: { in: [userId, dto.targetUserId] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (participants.length !== 2) {
      throw new BadRequestException("Peserta chat tidak valid");
    }

    const roomInclude = {
      tenant: {
        select: { id: true, name: true, subdomain: true },
      },
      participants: {
        select: { id: true, firstName: true, lastName: true, avatar: true, role: true, lastActiveAt: true },
      },
      messages: {
        select: {
          id: true,
          text: true,
          senderId: true,
          isRead: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    };

    // Cari room yang sudah ada antara buyer-seller di tenant yang sama
    let room = await this.prisma.chatRoom.findFirst({
      where: {
        tenantId: dto.tenantId,
        orderId: null,
        AND: [
          { participants: { some: { id: userId } } },
          { participants: { some: { id: dto.targetUserId } } },
        ],
      },
      include: roomInclude,
    });

    let created = false;

    if (!room) {
      // === ROOM BELUM ADA → Buat baru ===
      const contextType = dto.productId ? "product" : dto.serviceId ? "service" : dto.jobId ? "job" : null;
      const contextId = dto.productId || dto.serviceId || dto.jobId || null;

      room = await this.prisma.chatRoom.create({
        data: {
          tenantId: dto.tenantId,
          contextType,
          contextId,
          contextTitle: dto.itemTitle || null,
          participants: {
            connect: [{ id: userId }, { id: dto.targetUserId }],
          },
        },
        include: roomInclude,
      });

      created = true;
    }

    // === SELALU kirim pesan template berisi detail item ===
    // Baik room baru maupun room lama, kirim pesan konteks item
    if (dto.productId || dto.serviceId || dto.jobId) {
      const contextMessage = this.buildContextMessage(dto);

      await this.prisma.chatMessage.create({
        data: {
          roomId: room.id,
          senderId: userId,
          text: contextMessage,
          attachments: [],
        },
      });

      // Update room timestamp agar muncul di atas daftar chat
      await this.prisma.chatRoom.update({
        where: { id: room.id },
        data: {
          updatedAt: new Date(),
          // Update konteks terakhir di room
          contextType: dto.productId ? "product" : dto.serviceId ? "service" : dto.jobId ? "job" : undefined,
          contextId: dto.productId || dto.serviceId || dto.jobId || undefined,
          contextTitle: dto.itemTitle || undefined,
        },
      });

      // Auto-create chat transaction for product/service
      if (dto.productId || dto.serviceId) {
        const contextType = dto.productId ? "product" : "service";
        const contextId = (dto.productId || dto.serviceId)!;
        
        // Find seller (tenant owner)
        const tenantData = await this.prisma.tenant.findUnique({
          where: { id: dto.tenantId },
          select: { ownerId: true },
        });

        if (tenantData) {
          await this.createChatTransaction({
            roomId: room.id,
            buyerId: userId,
            sellerId: dto.targetUserId,
            tenantId: dto.tenantId,
            contextType,
            contextId,
            contextTitle: dto.itemTitle || "Item",
            variantName: dto.variantName,
            quantity: dto.quantity,
            packageTier: dto.packageTier,
            packageTitle: dto.packageTitle,
            price: dto.price || dto.packagePrice,
          });
        }
      }

      // Re-fetch room dengan pesan terbaru
      room = await this.prisma.chatRoom.findUnique({
        where: { id: room.id },
        include: roomInclude,
      });
    }

    return {
      room: {
        ...room,
        lastMessage: room?.messages?.[0] || null,
        context: {
          productId: dto.productId || null,
          serviceId: dto.serviceId || null,
          jobId: dto.jobId || null,
          itemTitle: dto.itemTitle || null,
        },
      },
      created,
    };
  }

  /**
   * Send Chat Message
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto) {
    const { roomId, text, attachments } = sendMessageDto;

    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: { some: { id: userId } },
      },
      select: {
        id: true,
        tenantId: true,
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!room) {
      throw new BadRequestException("Chat room not found or access denied");
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        text,
        attachments: attachments || [],
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true, role: true, lastActiveAt: true },
        },
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    const sender = room.participants.find((participant) => participant.id === userId);
    const senderName =
      [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") || "Pengguna";
    const recipients = room.participants.filter((participant) => participant.id !== userId);

    await Promise.allSettled(
      recipients.map((recipient) =>
        this.notificationEvents.onNewChatMessage({
          tenantId: room.tenantId,
          recipientId: recipient.id,
          senderName,
          roomId,
        }),
      ),
    );

    return message;
  }

  /**
   * Get Chat Messages
   */
  async getMessages(
    userId: string,
    roomId: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: { some: { id: userId } },
      },
    });

    if (!room) {
      throw new BadRequestException("Chat room not found or access denied");
    }

    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId },
        skip,
        take,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, avatar: true, role: true, lastActiveAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.chatMessage.count({ where: { roomId } }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      messages.reverse(),
      total,
      page,
      limit,
    );
  }

  /**
   * Get Chat Rooms for User
   */
  async getChatRooms(userId: string, page: number = 1, limit: number = 50) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where: {
          participants: { some: { id: userId } },
        },
        skip,
        take,
        select: {
          id: true,
          tenantId: true,
          contextType: true,
          contextId: true,
          contextTitle: true,
          createdAt: true,
          updatedAt: true,
          tenant: {
            select: { id: true, name: true, subdomain: true },
          },
          participants: {
            select: { id: true, firstName: true, lastName: true, avatar: true, role: true, lastActiveAt: true },
          },
          order: {
            select: { id: true, title: true, status: true },
          },
          messages: {
            select: {
              id: true,
              text: true,
              senderId: true,
              isRead: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.chatRoom.count({
        where: {
          participants: { some: { id: userId } },
        },
      }),
    ]);

    const roomsWithMeta = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            roomId: room.id,
            senderId: { not: userId },
            isRead: false,
          },
        });

        return {
          ...room,
          lastMessage: room.messages[0] || null,
          unreadCount,
        };
      }),
    );

    return PaginationHelper.formatPaginatedResponse(
      roomsWithMeta,
      total,
      page,
      limit,
    );
  }

  /**
   * Mark Messages as Read
   */
  async markAsRead(userId: string, roomId: string) {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: { some: { id: userId } },
      },
    });

    if (!room) {
      throw new BadRequestException("Chat room not found");
    }

    const unreadMessages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
      },
      select: { id: true },
    });

    await this.prisma.chatMessage.updateMany({
      where: {
        roomId,
        senderId: { not: userId },
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      message: "Messages marked as read",
      roomId,
      readAt: new Date().toISOString(),
      messageIds: unreadMessages.map((item) => item.id),
    };
  }

  // ============================================
  // CHAT TRANSACTIONS
  // ============================================

  /**
   * Create a chat transaction (auto-created when buyer contacts seller about a product/service)
   * Called internally from openOrCreateRoom when context is provided
   */
  async createChatTransaction(data: {
    roomId: string;
    buyerId: string;
    sellerId: string;
    tenantId: string;
    contextType: string;
    contextId: string;
    contextTitle: string;
    variantName?: string;
    quantity?: number;
    packageTier?: string;
    packageTitle?: string;
    price?: number;
  }) {
    // Check if a transaction already exists for this buyer+item in this room
    const existing = await this.prisma.chatTransaction.findFirst({
      where: {
        roomId: data.roomId,
        buyerId: data.buyerId,
        contextType: data.contextType,
        contextId: data.contextId,
        status: "ONGOING",
      },
    });

    if (existing) {
      // Update existing ongoing transaction with new details
      return this.prisma.chatTransaction.update({
        where: { id: existing.id },
        data: {
          variantName: data.variantName,
          quantity: data.quantity,
          packageTier: data.packageTier,
          packageTitle: data.packageTitle,
          price: data.price,
        },
      });
    }

    // Create new transaction
    const transaction = await this.prisma.chatTransaction.create({
      data: {
        roomId: data.roomId,
        buyerId: data.buyerId,
        sellerId: data.sellerId,
        tenantId: data.tenantId,
        contextType: data.contextType,
        contextId: data.contextId,
        contextTitle: data.contextTitle,
        variantName: data.variantName,
        quantity: data.quantity,
        packageTier: data.packageTier,
        packageTitle: data.packageTitle,
        price: data.price,
        status: "ONGOING",
      },
    });

    // Get buyer info for notification
    const buyer = await this.prisma.user.findUnique({
      where: { id: data.buyerId },
      select: { firstName: true, lastName: true },
    });

    const buyerName = buyer ? `${buyer.firstName} ${buyer.lastName}` : "User";

    // Send notification to seller/admin
    await this.notificationEvents.onNewChatTransaction({
      tenantId: data.tenantId,
      buyerId: data.buyerId,
      buyerName,
      sellerId: data.sellerId,
      transactionId: transaction.id,
      roomId: data.roomId,
      contextType: data.contextType,
      contextTitle: data.contextTitle,
      price: data.price,
      quantity: data.quantity,
    });

    return transaction;
  }

  /**
   * Seller/Admin marks a chat transaction as completed
   * After this, buyer can leave a review
   */
  async markTransactionComplete(userId: string, transactionId: string) {
    const transaction = await this.prisma.chatTransaction.findUnique({
      where: { id: transactionId },
      include: { 
        room: { 
          include: { 
            participants: { select: { id: true } },
            tenant: { select: { subdomain: true } }
          } 
        } 
      },
    });

    if (!transaction) {
      throw new BadRequestException("Transaksi tidak ditemukan");
    }

    // Check if user is seller, admin, or super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    const isSeller = transaction.sellerId === userId;
    const isPlatformTenant = transaction.room.tenant.subdomain === "platform";

    // For platform tenant (admin products), only admin can mark complete
    // For regular tenant, only seller can mark complete
    if (isPlatformTenant && !isAdmin) {
      throw new BadRequestException("Hanya admin yang bisa menandai transaksi ini selesai");
    } else if (!isPlatformTenant && !isSeller) {
      throw new BadRequestException("Hanya seller yang bisa menandai transaksi selesai");
    }

    if (transaction.status === "COMPLETED") {
      throw new BadRequestException("Transaksi sudah ditandai selesai");
    }

    const updated = await this.prisma.chatTransaction.update({
      where: { id: transactionId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: userId,
      },
    });

    // Send system message in chat
    const senderLabel = isAdmin ? "admin" : "seller";
    await this.prisma.chatMessage.create({
      data: {
        roomId: transaction.roomId,
        senderId: userId,
        text: `✅ Transaksi "${transaction.contextTitle}" telah ditandai selesai oleh ${senderLabel}.\n\nBuyer sekarang dapat memberikan ulasan untuk produk/jasa ini.`,
        attachments: [],
      },
    });

    await this.prisma.chatRoom.update({
      where: { id: transaction.roomId },
      data: { updatedAt: new Date() },
    });

    // Send notification to buyer
    await this.notificationEvents.onTransactionCompleted({
      tenantId: transaction.tenantId,
      buyerId: transaction.buyerId,
      transactionId: transaction.id,
      roomId: transaction.roomId,
      itemTitle: transaction.contextTitle,
    });

    return { message: "Transaksi berhasil ditandai selesai", transaction: updated };
  }

  /**
   * Get transactions for a chat room
   */
  async getRoomTransactions(userId: string, roomId: string) {
    // Verify user is participant
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        participants: { some: { id: userId } },
      },
    });

    if (!room) {
      throw new BadRequestException("Chat room tidak ditemukan");
    }

    const transactions = await this.prisma.chatTransaction.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });

    return { data: transactions };
  }

  /**
   * Get completed transactions for buyer (for review eligibility)
   */
  async getCompletedTransactionsForBuyer(buyerId: string) {
    const transactions = await this.prisma.chatTransaction.findMany({
      where: {
        buyerId,
        status: "COMPLETED",
        reviewId: null, // belum direview
      },
      orderBy: { completedAt: "desc" },
    });

    return { data: transactions };
  }

  /**
   * Get seller's transactions (ongoing + completed)
   */
  async getSellerTransactions(sellerId: string, status?: string) {
    const where: any = { sellerId };
    if (status) where.status = status;

    const transactions = await this.prisma.chatTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return { data: transactions };
  }

  // ============================================
  // ADMIN CHAT METHODS
  // ============================================

  /**
   * Get all admin chat rooms (for Super Admin dashboard)
   * @param adminId - Admin user ID
   * @param page - Page number
   * @param limit - Items per page
   * @param unassigned - Filter for unassigned rooms only
   */
  async getAdminChatRooms(adminId: string, page: number, limit: number, unassigned: boolean = false) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    // Verify admin role
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN")) {
      throw new BadRequestException("Unauthorized: Admin access required");
    }

    const where: any = {
      isAdminChat: true,
    };

    // Filter for unassigned rooms if requested
    if (unassigned) {
      where.adminUserId = null;
    } else {
      // Show rooms assigned to this admin or unassigned
      where.OR = [
        { adminUserId: adminId },
        { adminUserId: null },
      ];
    }

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where,
        skip,
        take,
        include: {
          tenant: {
            select: { id: true, name: true, subdomain: true },
          },
          participants: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              role: true,
              lastActiveAt: true,
            },
          },
          messages: {
            select: {
              id: true,
              text: true,
              senderId: true,
              isRead: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderId: { not: adminId },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.chatRoom.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(rooms, total, page, limit);
  }

  /**
   * Assign admin to a chat room
   * @param adminId - Admin user ID
   * @param roomId - Chat room ID
   */
  async assignAdminToRoom(adminId: string, roomId: string) {
    // Verify admin role
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, firstName: true, lastName: true },
    });

    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN")) {
      throw new BadRequestException("Unauthorized: Admin access required");
    }

    // Verify room exists and is admin chat
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { id: true, isAdminChat: true },
    });

    if (!room) {
      throw new BadRequestException("Chat room not found");
    }

    if (!room.isAdminChat) {
      throw new BadRequestException("This is not an admin support chat room");
    }

    // Assign admin to room
    const updatedRoom = await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { adminUserId: adminId },
      include: {
        tenant: {
          select: { id: true, name: true, subdomain: true },
        },
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Send system message
    await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: adminId,
        text: `🛠️ ${admin.firstName} ${admin.lastName} telah ditugaskan untuk membantu Anda.`,
      },
    });

    return { room: updatedRoom };
  }

  /**
   * Open admin support chat room
   * @param adminId - Admin user ID
   * @param userId - User ID to chat with
   * @param contextType - Context type (e.g., "admin_support", "product", "service")
   * @param contextId - Context ID
   * @param contextTitle - Context title
   */
  async openAdminSupportRoom(
    adminId: string,
    userId: string,
    contextType?: string,
    contextId?: string,
    contextTitle?: string,
  ) {
    // Verify admin role
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, firstName: true, lastName: true },
    });

    if (!admin || (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN")) {
      throw new BadRequestException("Unauthorized: Admin access required");
    }

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    // Get platform tenant (for admin chats, use first tenant or create a platform tenant)
    let platformTenant = await this.prisma.tenant.findFirst({
      where: { subdomain: "platform" },
      select: { id: true },
    });

    if (!platformTenant) {
      // Create platform tenant if not exists
      const superAdmin = await this.prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
        select: { id: true },
      });

      if (!superAdmin) {
        throw new BadRequestException("Platform tenant not found and no super admin exists");
      }

      platformTenant = await this.prisma.tenant.create({
        data: {
          subdomain: "platform",
          name: "Platform Support",
          ownerId: superAdmin.id,
          isActive: true,
        },
        select: { id: true },
      });
    }

    // Check if admin chat room already exists between admin and user
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        isAdminChat: true,
        participants: {
          every: {
            id: { in: [adminId, userId] },
          },
        },
      },
      include: {
        tenant: {
          select: { id: true, name: true, subdomain: true },
        },
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            lastActiveAt: true,
          },
        },
        messages: {
          select: {
            id: true,
            text: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (existingRoom) {
      return { room: existingRoom, isNew: false };
    }

    // Create new admin support room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        tenantId: platformTenant.id,
        isAdminChat: true,
        adminUserId: adminId,
        contextType: contextType || "admin_support",
        contextId,
        contextTitle,
        participants: {
          connect: [{ id: adminId }, { id: userId }],
        },
      },
      include: {
        tenant: {
          select: { id: true, name: true, subdomain: true },
        },
        participants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            lastActiveAt: true,
          },
        },
        messages: {
          select: {
            id: true,
            text: true,
            senderId: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    // Send welcome message
    await this.prisma.chatMessage.create({
      data: {
        roomId: newRoom.id,
        senderId: adminId,
        text: `👋 Halo ${user.firstName}, saya ${admin.firstName} dari tim support. Ada yang bisa saya bantu?`,
      },
    });

    return { room: newRoom, isNew: true };
  }
}
