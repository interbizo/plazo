import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { JobsService } from "./jobs.service";
import { JobsController } from "./jobs.controller";
import { FeatureFlagGuard } from "@common/guards/feature-flag.guard";

@Module({
  imports: [DatabaseModule, NotificationsModule],
  providers: [JobsService, FeatureFlagGuard],
  controllers: [JobsController],
  exports: [JobsService],
})
export class JobsModule {}
