import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { OrdersCronService } from "./orders-cron.service";
import { EscrowService } from "./escrow.service";
import { StockService } from "./stock.service";
import { StockCronService } from "./stock-cron.service";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), NotificationsModule],
  providers: [
    OrdersService,
    OrdersCronService,
    EscrowService,
    StockService,
    StockCronService,
  ],
  controllers: [OrdersController],
  exports: [OrdersService, EscrowService, StockService],
})
export class OrdersModule {}
