import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { CommonModule } from "@common/common.module";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import { FeatureGuard } from "@common/guards/feature.guard";

@Module({
  imports: [DatabaseModule, CommonModule],
  providers: [ProductsService, FeatureGuard],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
