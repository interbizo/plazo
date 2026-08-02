import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateNotificationDto } from "./notifications.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create Notification
   */
  async createNotification(
    tenantId: string,
    createNotificationDto: CreateNotificationDto,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: createNotificationDto.userId,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type,
        referenceId: createNotificationDto.referenceId,
        referenceType: createNotificationDto.referenceType,
      },
    });

    return { notification };
  }

  /**
   * Get User Notifications
   */
  async getNotifications(
    tenantId: string | null,
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where = {
      userId,
      ...(tenantId ? { tenantId } : {}),
      ...(unreadOnly && { isRead: false }),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    // Notifikasi transaksi chat lama hanya menyimpan transactionId. Lengkapi
    // respons dengan roomId agar tetap dapat membuka room chat yang benar.
    const transactionIdsWithoutRoom = notifications.flatMap((notification) => {
      const metadata = notification.metadata;
      const hasRoomId =
        metadata &&
        typeof metadata === "object" &&
        !Array.isArray(metadata) &&
        typeof metadata.roomId === "string";

      return notification.referenceType === "chat_transaction" &&
        notification.referenceId &&
        !hasRoomId
        ? [notification.referenceId]
        : [];
    });

    const chatTransactions = transactionIdsWithoutRoom.length
      ? await this.prisma.chatTransaction.findMany({
          where: { id: { in: [...new Set(transactionIdsWithoutRoom)] } },
          select: { id: true, roomId: true },
        })
      : [];
    const roomIdByTransactionId = new Map(
      chatTransactions.map((transaction) => [transaction.id, transaction.roomId]),
    );

    const enrichedNotifications = notifications.map((notification) => {
      if (notification.referenceType !== "chat_transaction" || !notification.referenceId) {
        return notification;
      }

      const roomId = roomIdByTransactionId.get(notification.referenceId);
      if (!roomId) return notification;

      const metadata =
        notification.metadata &&
        typeof notification.metadata === "object" &&
        !Array.isArray(notification.metadata)
          ? notification.metadata
          : {};

      return {
        ...notification,
        metadata: { ...metadata, roomId },
      };
    });

    return PaginationHelper.formatPaginatedResponse(
      enrichedNotifications,
      total,
      page,
      limit,
    );
  }

  /**
   * Mark Notification as Read
   */
  async markAsRead(
    tenantId: string | null,
    userId: string,
    notificationId: string,
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!notification) {
      throw new BadRequestException("Notifikasi tidak ditemukan");
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { notification: updated };
  }

  /**
   * Mark All as Read
   */
  async markAllAsRead(tenantId: string | null, userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: "Semua notifikasi ditandai sudah dibaca" };
  }

  /**
   * Get Unread Count
   */
  async getUnreadCount(tenantId: string | null, userId: string) {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        ...(tenantId ? { tenantId } : {}),
        isRead: false,
      },
    });

    return { unreadCount: count };
  }

  /**
   * Delete Notification
   */
  async deleteNotification(
    tenantId: string | null,
    userId: string,
    notificationId: string,
  ) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (!notification) {
      throw new BadRequestException("Notifikasi tidak ditemukan");
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: "Notifikasi berhasil dihapus" };
  }
}
