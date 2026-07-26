import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { PublicMarketplaceService } from "./public-marketplace.service";
import { PublicMarketplaceController } from "./public-marketplace.controller";

@Module({
  imports: [DatabaseModule],
  providers: [PublicMarketplaceService],
  controllers: [PublicMarketplaceController],
  exports: [PublicMarketplaceService],
})
export class PublicMarketplaceModule {}
