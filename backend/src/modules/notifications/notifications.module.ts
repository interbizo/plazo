import { Module, Global, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationEventsService } from "./notification-events.service";
import { WebsocketModule } from "@modules/websocket/websocket.module";

@Global()
@Module({
  imports: [DatabaseModule, forwardRef(() => WebsocketModule)],
  providers: [NotificationsService, NotificationEventsService],
  controllers: [NotificationsController],
  exports: [NotificationsService, NotificationEventsService],
})
export class NotificationsModule {}
