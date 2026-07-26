import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { AccountAppealService } from "./account-appeal.service";

/**
 * Cron job to auto-delete accounts past 30-day grace period.
 * Runs daily at 2:00 AM.
 */
@Injectable()
export class AccountAppealCronService {
  private readonly logger = new Logger(AccountAppealCronService.name);

  constructor(private appealService: AccountAppealService) {}

  @Cron("0 2 * * *") // Every day at 02:00
  async handleExpiredGracePeriods() {
    this.logger.log("Running scheduled task: delete expired suspended accounts");
    try {
      const result = await this.appealService.deleteExpiredAccounts();
      if (result.deleted > 0) {
        this.logger.log(`Permanently deleted ${result.deleted} expired accounts`);
      }
    } catch (error) {
      this.logger.error("Failed to delete expired accounts:", error);
    }
  }
}
