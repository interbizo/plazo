import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SubscriptionService } from "./subscription.service";
import { PrismaService } from "@modules/database/prisma.service";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

// Subscription cron jobs untuk downgrade H+7, reminder langganan, dan auto-expire flash sale.
@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private subscriptionService: SubscriptionService,
    private prisma: PrismaService,
    private notificationEvents: NotificationEventsService,
  ) {}

  // Run daily at 1:00 AM untuk downgrade subscription yang melewati masa tenggang.
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

  // Run daily at 9:00 AM untuk reminder H-3, H-1, H, dan H+3; H+7 dikirim saat downgrade.
  @Cron("0 9 * * *") // Every day at 09:00
  async handleExpiryWarnings() {
    this.logger.log("Running scheduled task: subscription expiry reminders");
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const offsets = [-3, -1, 0, 3] as const;

      for (const offset of offsets) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - offset);
        const targetDateEnd = new Date(targetDate);
        targetDateEnd.setDate(targetDateEnd.getDate() + 1);

        const tenants = await this.prisma.tenant.findMany({
          where: {
            subscriptionPlan: { not: "FREE" },
            subscriptionExpiresAt: {
              gte: targetDate,
              lt: targetDateEnd,
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

        for (const tenant of tenants) {
          const sellerName = `${tenant.owner?.firstName || ""} ${tenant.owner?.lastName || ""}`.trim();

          await this.notificationEvents.onSubscriptionReminder({
            tenantId: tenant.id,
            sellerId: tenant.ownerId,
            sellerName,
            plan: tenant.subscriptionPlan,
            daysOffset: offset,
          });
        }

        if (tenants.length > 0) {
          this.logger.log(`Sent subscription reminder (H${offset > 0 ? "+" : ""}${offset}) to ${tenants.length} sellers`);
        }
      }
    } catch (error) {
      this.logger.error("Failed to send subscription expiry reminders:", error);
    }
  }

  // Run every hour untuk auto-expire flash sale event yang sudah melewati endDate.
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
