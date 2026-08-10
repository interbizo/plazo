import { Injectable, Logger, Inject, Optional, forwardRef } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "@modules/database/prisma.service";
import {
  NotificationChannelAdapter,
  NotificationChannelRegistry,
} from "./notification-channel";
import { ChatGateway } from "@modules/websocket/chat.gateway";
import { WhatsAppChannelAdapter } from "./channels/whatsapp.channel";

export interface NotificationDispatchParams {
  tenantId: string;
  userId: string;
  // Nama event dipakai sebagai type in-app dan event delivery.
  event: string;
  // Konten notifikasi static dari pemanggil.
  fallbackTitle: string;
  fallbackMessage: string;
  // Variabel untuk render placeholder {{var}}.
  vars?: Record<string, string | number | boolean | undefined | null>;
  // Channel yang ingin dikirim dan default-nya hanya WhatsApp.
  channels?: NotificationChannel[];
  // Tujuan WhatsApp atau email; bila kosong, engine mengambil dari data user.
  recipient?: { whatsapp?: string | null; email?: string | null };
  // Referensi untuk dedup in-app & pelacakan.
  referenceId?: string;
  referenceType?: string;
  // Lewati penulisan NotificationDelivery untuk pengiriman langsung.
  skipLog?: boolean;
  // Jumlah percobaan kirim untuk channel eksternal (default 1).
  maxAttempts?: number;
}

export interface DispatchResult {
  event: string;
  sent: NotificationChannel[];
  failed: NotificationChannel[];
  skipped: NotificationChannel[];
  deliveries: Array<{ channel: NotificationChannel; status: NotificationDeliveryStatus; deliveryId?: string }>;
}

// Notification Engine adalah titik terpusat untuk in-app dan WhatsApp delivery.
@Injectable()
export class NotificationEngineService {
  private readonly logger = new Logger(NotificationEngineService.name);
  private readonly registry = new NotificationChannelRegistry();

  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway?: ChatGateway,
    whatsappChannel?: WhatsAppChannelAdapter,
  ) {
    // Daftarkan channel bawaan.
    if (whatsappChannel) this.registry.register(whatsappChannel);
  }

  // Daftarkan channel tambahan untuk kebutuhan khusus di luar modul.
  registerChannel(adapter: NotificationChannelAdapter) {
    this.registry.register(adapter);
  }

  // Dispatch notifikasi ke channel yang diminta dan catat pengiriman eksternal ke NotificationDelivery.
  async dispatch(params: NotificationDispatchParams): Promise<DispatchResult> {
    const channels = params.channels?.length
      ? params.channels
      : [NotificationChannel.WHATSAPP];

    const resolvedRecipient = await this.resolveRecipient(params);

    const result: DispatchResult = {
      event: params.event,
      sent: [],
      failed: [],
      skipped: [],
      deliveries: [],
    };

    for (const channel of channels) {
      const adapter = this.registry.get(channel);

      // Channel tidak terdaftar → skip
      if (!adapter) {
        result.skipped.push(channel);
        continue;
      }

      // Siapkan konten dari fallback static.
      const rendered = await this.renderForChannel(
        params.event,
        channel,
        params.fallbackTitle,
        params.fallbackMessage,
        params.vars || {},
      );

      // In-app dibuat di tabel Notification dan dikirim via WebSocket.
      if (channel === NotificationChannel.IN_APP) {
        await this.createInAppNotification(params, rendered.title, rendered.message);
        result.sent.push(channel);
        continue;
      }

      const recipient = this.getRecipientValue(channel, resolvedRecipient);
      if (!recipient) {
        this.logger.debug(
          `[engine] ${channel} skipped for user ${params.userId}: no recipient`,
        );
        result.skipped.push(channel);
        continue;
      }

      const maxAttempts = params.maxAttempts ?? 1;
      const delivery = params.skipLog
        ? null
        : await this.createDelivery({
            tenantId: params.tenantId,
            userId: params.userId,
            channel,
            event: params.event,
            recipient,
            title: rendered.title,
            message: rendered.message,
          });

      // Channel belum tersedia ditandai skipped agar tidak menjadi FAILED berulang.
      if (!adapter.isAvailable()) {
        result.skipped.push(channel);
        if (!params.skipLog && delivery) {
          await this.updateDeliveryStatus(delivery.id, NotificationDeliveryStatus.PENDING, 0, undefined, "channel unavailable");
        }
        continue;
      }

      let success = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        success = await adapter.send({
          recipient,
          title: rendered.title,
          message: rendered.message,
          metadata: { event: params.event, deliveryId: delivery?.id },
        });
        if (success) break;
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }

      if (success) {
        result.sent.push(channel);
        if (!params.skipLog && delivery) {
          await this.updateDeliveryStatus(
            delivery.id,
            NotificationDeliveryStatus.SENT,
            maxAttempts,
            new Date(),
            undefined,
          );
        }
      } else {
        result.failed.push(channel);
        if (!params.skipLog && delivery) {
          await this.updateDeliveryStatus(
            delivery.id,
            NotificationDeliveryStatus.FAILED,
            maxAttempts,
            undefined,
            "send failed",
          );
        }
      }
    }

    return result;
  }

  // Buat notifikasi in-app di model Notification dengan dedup 5 menit.
  private async createInAppNotification(
    params: NotificationDispatchParams,
    title: string,
    message: string,
  ) {
    try {
      if (params.referenceId && params.referenceType) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const existing = await this.prisma.notification.findFirst({
          where: {
            userId: params.userId,
            type: params.event,
            referenceId: params.referenceId,
            referenceType: params.referenceType,
            createdAt: { gte: fiveMinutesAgo },
          },
        });
        if (existing) {
          this.logger.debug(`[engine] Duplicate in-app notification prevented for ${params.userId}`);
          return;
        }
      }

      const notification = await this.prisma.notification.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          title,
          message,
          type: params.event,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
          metadata: (params.vars as Prisma.InputJsonObject) || undefined,
        },
      });

      if (this.chatGateway) {
        try {
          this.chatGateway.sendNotificationToUser(params.userId, notification);
        } catch (error) {
          this.logger.error(`[engine] WebSocket push failed for user ${params.userId}`, error);
        }
      }
    } catch (error) {
      this.logger.error(`[engine] Failed to create in-app notification: ${error}`);
    }
  }

  private async resolveRecipient(params: NotificationDispatchParams) {
    if (params.recipient) return params.recipient;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true, whatsappNumber: true, phone: true },
      });
      return {
        email: user?.email ?? null,
        whatsapp: user?.whatsappNumber ?? user?.phone ?? null,
      };
    } catch {
      return { email: null, whatsapp: null };
    }
  }

  private getRecipientValue(
    channel: NotificationChannel,
    recipient: { whatsapp?: string | null; email?: string | null },
  ): string | null {
    if (channel === NotificationChannel.EMAIL) return recipient.email ?? null;
    if (channel === NotificationChannel.WHATSAPP) return recipient.whatsapp ?? null;
    return null;
  }

  private renderForChannel(
    _event: string,
    _channel: NotificationChannel,
    fallbackTitle: string,
    fallbackMessage: string,
    vars: Record<string, string | number | boolean | undefined | null>,
  ) {
    const replace = (value: string) =>
      value.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_match, key: string) => {
        const v = vars[key];
        return v === undefined || v === null ? "" : String(v);
      });

    return {
      title: replace(fallbackTitle),
      message: replace(fallbackMessage),
    };
  }

  private async createDelivery(data: {
    tenantId?: string | null;
    userId?: string | null;
    channel: NotificationChannel;
    event: string;
    recipient: string;
    title: string;
    message: string;
  }) {
    return this.prisma.notificationDelivery.create({
      data: {
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? null,
        channel: data.channel,
        event: data.event,
        recipient: data.recipient,
        title: data.title,
        message: data.message,
        status: NotificationDeliveryStatus.PENDING,
        attempts: 0,
      },
    });
  }

  private async updateDeliveryStatus(
    deliveryId: string,
    status: NotificationDeliveryStatus,
    attempts: number,
    sentAt?: Date,
    lastError?: string,
  ) {
    try {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status, attempts, sentAt, lastError },
      });
    } catch (error) {
      this.logger.error(`[engine] Failed to update delivery ${deliveryId}: ${error}`);
    }
  }

  // Retry pengiriman delivery yang gagal atau pending.
  async retryFailedDeliveries(limit = 50): Promise<number> {
    const deliveries = await this.prisma.notificationDelivery.findMany({
      where: {
        OR: [
          { status: NotificationDeliveryStatus.FAILED },
          { status: NotificationDeliveryStatus.PENDING },
        ],
        attempts: { lt: 3 },
      },
      take: limit,
      orderBy: { createdAt: "asc" },
    });

    let successCount = 0;
    for (const delivery of deliveries) {
      const adapter = this.registry.get(delivery.channel);
      if (!adapter || !adapter.isAvailable()) continue;

      const ok = await adapter.send({
        recipient: delivery.recipient ?? "",
        title: delivery.title ?? "",
        message: delivery.message ?? "",
        metadata: { event: delivery.event, deliveryId: delivery.id },
      });

      await this.updateDeliveryStatus(
        delivery.id,
        ok ? NotificationDeliveryStatus.SENT : NotificationDeliveryStatus.FAILED,
        delivery.attempts + 1,
        ok ? new Date() : undefined,
        ok ? undefined : "retry failed",
      );

      if (ok) successCount++;
    }

    return successCount;
  }
}
