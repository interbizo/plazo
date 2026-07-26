import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SubscriptionService } from "./subscription.service";
import { PrismaService } from "@modules/database/prisma.service";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

/**
 * Subscription Cron Jobs:
 * 1. Check expired subscriptions daily → downgrade to FREE
 * 2. Send expiry warning 3 days before → notify seller to renew
 * 3. Auto-expire flash sale events that passed endDate
 */
@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
    private notificationEvents: NotificationEventsService,
  ) {}

  /**
   * Run daily at 1:00 AM — Check and downgrade expired subscriptions
   */
  @Cron("0 1 * * *") // Every day at 01:00
  async handleExpiredSubscriptions() {
    this.logger.log("Running scheduled task: check expired subscriptions");
    try {
      const result = await this.subscriptionService.checkExpiredSubscriptions();
      if (result.expired > 0) {
        this.logger.log(`Downgraded ${result.expired} expired subscriptions to FREE`);
      }
    } catch (error) {
      this.logger.error("Failed to check expired subscriptions:", error);
    }
  }

  /**
   * Run daily at 9:00 AM — Warn sellers 3 days before subscription expires
   */
  @Cron("0 9 * * *") // Every day at 09:00
  async handleExpiryWarnings() {
    this.logger.log("Running scheduled task: subscription expiry warnings");
    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const today = new Date();

      // Find tenants expiring in the next 3 days that haven't been warned yet
      const expiringTenants = await this.prisma.tenant.findMany({
        where: {
          subscriptionPlan: { not: "FREE" },
          subscriptionExpiresAt: {
            gte: today,
            lte: threeDaysFromNow,
          },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true,
          owner: { select: { firstName: true, lastName: true } },
        },
      });

      for (const tenant of expiringTenants) {
        const daysLeft = Math.ceil(
          ((tenant.subscriptionExpiresAt?.getTime() || 0) - today.getTime()) / (1000 * 60 * 60 * 24),
        );

        const sellerName = `${tenant.owner?.firstName || ""} ${tenant.owner?.lastName || ""}`.trim();

        await this.notificationEvents.onSubscriptionExpiringSoon({
          tenantId: tenant.id,
          sellerId: tenant.ownerId,
          sellerName,
          plan: tenant.subscriptionPlan,
          daysLeft,
        });
      }

      if (expiringTenants.length > 0) {
        this.logger.log(`Sent expiry warnings to ${expiringTenants.length} sellers`);
      }
    } catch (error) {
      this.logger.error("Failed to send expiry warnings:", error);
    }
  }

  /**
   * Run every hour — Auto-expire flash sale events that passed endDate
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredFlashSales() {
    try {
      const now = new Date();

      const expired = await this.prisma.flashSaleEvent.updateMany({
        where: {
          endDate: { lt: now },
          isActive: true,
        },
        data: { isActive: false },
      });

      // Also expire individual flash sale items that passed their own endDate
      await this.prisma.flashSaleItem.updateMany({
        where: {
          endDate: { lt: now },
          status: "APPROVED",
        },
        data: { status: "EXPIRED" },
      });

      if (expired.count > 0) {
        this.logger.log(`Auto-expired ${expired.count} flash sale events`);
      }
    } catch (error) {
      this.logger.error("Failed to expire flash sales:", error);
    }
  }
}
