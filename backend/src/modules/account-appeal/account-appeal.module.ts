import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AccountAppealController } from "./account-appeal.controller";
import { AccountAppealService } from "./account-appeal.service";
import { AccountAppealCronService } from "./account-appeal-cron.service";
import { DatabaseModule } from "@modules/database/database.module";
import { EmailModule } from "@modules/email/email.module";

@Module({
  imports: [DatabaseModule, ScheduleModule.forRoot(), EmailModule],
  controllers: [AccountAppealController],
  providers: [AccountAppealService, AccountAppealCronService],
  exports: [AccountAppealService],
})
export class AccountAppealModule {}
