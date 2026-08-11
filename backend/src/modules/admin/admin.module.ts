import { Module } from "@nestjs/common";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";
import { DatabaseModule } from "../database/database.module";
import { SubscriptionModule } from "../subscription/subscription.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DatabaseBackupService } from "./database-backup.service";
import { GoogleDriveService } from "./google-drive.service";

@Module({
  imports: [DatabaseModule, SubscriptionModule, NotificationsModule],
  providers: [AdminService, DatabaseBackupService, GoogleDriveService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
