import { Module, Global, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationEventsService } from "./notification-events.service";
import { NotificationEngineService } from "./notification-engine.service";
import { WhatsAppChannelAdapter } from "./channels/whatsapp.channel";
import { FontteService } from "@common/services/fonnte.service";
import { WebsocketModule } from "@modules/websocket/websocket.module";

@Global()
@Module({
  imports: [DatabaseModule, forwardRef(() => WebsocketModule)],
  providers: [
    NotificationsService,
    NotificationEventsService,
    NotificationEngineService,
    WhatsAppChannelAdapter,
    FontteService,
  ],
  controllers: [NotificationsController],
  exports: [
    NotificationsService,
    NotificationEventsService,
    NotificationEngineService,
    WhatsAppChannelAdapter,
  ],
})
export class NotificationsModule {}
