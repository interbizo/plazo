import { Module } from "@nestjs/common";
import { ProductsModule } from "./products/products.module";
import { CategoriesModule } from "./categories/categories.module";
import { ServicesModule } from "./services/services.module";
import { PublicMarketplaceModule } from "./public/public-marketplace.module";

@Module({
  imports: [
    ProductsModule,
    CategoriesModule,
    ServicesModule,
    PublicMarketplaceModule,
  ],
  exports: [
    ProductsModule,
    CategoriesModule,
    ServicesModule,
    PublicMarketplaceModule,
  ],
})
export class MarketplaceModule {}
