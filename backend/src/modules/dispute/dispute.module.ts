import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { OrdersModule } from "@modules/orders/orders.module";
import { DisputeService } from "./dispute.service";
import { DisputeController } from "./dispute.controller";

@Module({
  imports: [DatabaseModule, OrdersModule, NotificationsModule],
  providers: [DisputeService],
  controllers: [DisputeController],
  exports: [DisputeService],
})
export class DisputeModule {}
