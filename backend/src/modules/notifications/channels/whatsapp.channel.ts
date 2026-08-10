import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { FontteService } from "@common/services/fonnte.service";
import {
  NotificationChannelAdapter,
  ChannelSendOptions,
} from "../notification-channel";

// WhatsApp channel mengirim via Fonnte API dengan format nomor otomatis.
@Injectable()
export class WhatsAppChannelAdapter implements NotificationChannelAdapter {
  readonly name = NotificationChannel.WHATSAPP;
  private readonly logger = new Logger(WhatsAppChannelAdapter.name);

  constructor(private readonly fonnteService: FontteService) {}

  isAvailable(): boolean {
    return Boolean(process.env.FONNTE_API_TOKEN);
  }

  async send(options: ChannelSendOptions): Promise<boolean> {
    try {
      const ok = await this.fonnteService.sendMessage(options.recipient, options.message);
      if (!ok) {
        this.logger.warn(
          `WhatsApp send returned false for ${options.recipient}`,
        );
      }
      return ok;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`WhatsApp send failed for ${options.recipient}: ${message}`);
      return false;
    }
  }
}
