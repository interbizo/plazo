import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { DatabaseModule } from "@modules/database/database.module";
import { NotificationsModule } from "@modules/notifications/notifications.module";
import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";
import { ReportsGateway } from "./reports.gateway";

@Module({
  imports: [
    DatabaseModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "15m" },
    }),
  ],
  providers: [ReportsService, ReportsGateway],
  controllers: [ReportsController],
  exports: [ReportsService, ReportsGateway],
})
export class ReportsModule {}
