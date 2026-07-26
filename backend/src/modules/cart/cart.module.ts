import { Module } from "@nestjs/common";
import { CartService } from "./cart.service";
import { CartController } from "./cart.controller";
import { DatabaseModule } from "../database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [CartService],
  controllers: [CartController],
  exports: [CartService],
})
export class CartModule {}
