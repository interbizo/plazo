import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { SellerTierGuard } from "@common/guards/seller-tier.guard";
import { ProposalsService } from "./proposals.service";
import { ProposalsController } from "./proposals.controller";

@Module({
  imports: [DatabaseModule],
  providers: [ProposalsService, SellerTierGuard],
  controllers: [ProposalsController],
  exports: [ProposalsService],
})
export class ProposalsModule {}
