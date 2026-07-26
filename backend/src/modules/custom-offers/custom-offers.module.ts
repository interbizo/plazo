import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { CustomOffersService } from "./custom-offers.service";
import { CustomOffersController } from "./custom-offers.controller";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [CustomOffersService],
  controllers: [CustomOffersController],
  exports: [CustomOffersService],
})
export class CustomOffersModule {}
