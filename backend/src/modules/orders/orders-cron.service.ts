import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { OrdersService } from "./orders.service";

/**
 * Scheduled tasks for the Orders module.
 * Uses @nestjs/schedule for reliable cron-based execution
 * instead of fragile setInterval.
 */
@Injectable()
export class OrdersCronService {
  private readonly logger = new Logger(OrdersCronService.name);

  constructor(private ordersService: OrdersService) {}

  /**
   * Expire unpaid orders every 5 minutes.
   * Orders with PENDING_PAYMENT status past their paymentDeadline
   * will be marked as EXPIRED and stock will be restored.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpireUnpaidOrders() {
    this.logger.debug("Running scheduled task: expire unpaid orders");
    try {
      await this.ordersService.expireUnpaidOrders();
    } catch (error) {
      this.logger.error("Scheduled task failed: expire unpaid orders", error);
    }
  }
}
