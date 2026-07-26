import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StockService } from './stock.service';

@Injectable()
export class StockCronService {
  private readonly logger = new Logger(StockCronService.name);

  constructor(private stockService: StockService) {}

  /**
   * Expire old stock reservations every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpireReservations() {
    this.logger.log('Running stock reservation expiry check...');
    try {
      await this.stockService.expireReservations();
    } catch (error) {
      this.logger.error('Failed to expire stock reservations', error);
    }
  }
}
