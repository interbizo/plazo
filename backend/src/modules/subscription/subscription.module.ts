import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionCronService } from "./subscription-cron.service";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { EmailModule } from "@modules/email/email.module";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), NotificationsModule, EmailModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionCronService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
