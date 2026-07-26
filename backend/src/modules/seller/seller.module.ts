import { Module } from "@nestjs/common";
import { SellerController } from "./seller.controller";
import { SellerService } from "./seller.service";
import { DatabaseModule } from "@modules/database/database.module";
import { CmsModule } from "@modules/cms/cms.module";
import { CommonModule } from "@common/common.module";
import { FeatureGuard } from "@common/guards/feature.guard";

@Module({
  imports: [DatabaseModule, CmsModule, CommonModule],
  controllers: [SellerController],
  providers: [SellerService, FeatureGuard],
  exports: [SellerService],
})
export class SellerModule {}
