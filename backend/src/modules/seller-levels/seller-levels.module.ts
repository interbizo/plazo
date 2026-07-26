import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { SellerLevelsService } from "./seller-levels.service";
import { SellerLevelsController } from "./seller-levels.controller";

@Module({
  imports: [DatabaseModule],
  providers: [SellerLevelsService],
  controllers: [SellerLevelsController],
  exports: [SellerLevelsService],
})
export class SellerLevelsModule {}
