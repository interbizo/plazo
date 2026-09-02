import { Module } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ServicesController } from "./services.controller";
import { DatabaseModule } from "../../database/database.module";
import { CommonModule } from "@common/common.module";
import { FeatureGuard } from "@common/guards/feature.guard";
import { UploadModule } from "@modules/upload/upload.module";

@Module({
  imports: [DatabaseModule, CommonModule, UploadModule],
  providers: [ServicesService, FeatureGuard],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
