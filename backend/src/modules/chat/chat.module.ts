import { Module, forwardRef } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { ChatService } from "./chat.service";
import { ChatController } from "./chat.controller";
import { NotificationsModule } from "@modules/notifications/notifications.module";

@Module({
  imports: [DatabaseModule, forwardRef(() => NotificationsModule)],
  providers: [ChatService],
  controllers: [ChatController],
  exports: [ChatService],
})
export class ChatModule {}
