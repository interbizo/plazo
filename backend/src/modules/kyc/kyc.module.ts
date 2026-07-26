import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { EmailModule } from "@modules/email/email.module";
import { KycService } from "./kyc.service";
import { KycController } from "./kyc.controller";

@Module({
  imports: [DatabaseModule, NotificationsModule, EmailModule],
  providers: [KycService],
  controllers: [KycController],
  exports: [KycService],
})
export class KycModule {}
