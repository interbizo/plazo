import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { 
  CreateProductDto, 
  UpdateProductDto,
  ToggleMarketplaceVisibilityDto,
} from "./products.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { FeatureGuard } from "@common/guards/feature.guard";
import { RequireFeature } from "@common/decorators/require-feature.decorator";
import { SubscriptionFeature } from "@common/types/subscription-features.types";
import { Roles } from "@common/decorators/roles.decorator";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/products")
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async createProduct(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.createProduct(
      tenantId,
      userId,
      createProductDto,
    );
  }

  @Get()
  async getProducts(
    @GetTenant("id") tenantId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("search") search?: string,
    @Query("categoryId") categoryId?: string,
    @Query("city") city?: string,
  ) {
    return this.productsService.getProducts(
      tenantId,
      page,
      limit,
      search,
      categoryId,
      city,
    );
  }

  @Get("by-slug/:slug")
  async getProductBySlug(
    @GetTenant("id") tenantId: string,
    @Param("slug") slug: string,
  ) {
    return this.productsService.getProductBySlug(tenantId, slug);
  }

  @Get(":id")
  async getProduct(
    @GetTenant("id") tenantId: string,
    @Param("id") productId: string,
  ) {
    return this.productsService.getProduct(tenantId, productId);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async updateProduct(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") productId: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(
      tenantId,
      productId,
      userId,
      updateProductDto,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async deleteProduct(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") productId: string,
  ) {
    return this.productsService.deleteProduct(tenantId, productId, userId);
  }

  @Patch(":id/marketplace-visibility")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Roles(UserRole.SELLER)
  @RequireFeature(SubscriptionFeature.PUBLISH_MARKETPLACE)
  toggleMarketplaceVisibility(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") productId: string,
    @Body() dto: ToggleMarketplaceVisibilityDto,
  ) {
    return this.productsService.toggleMarketplaceVisibility(
      tenantId,
      userId,
      productId,
      dto.publish,
    );
  }

  @Post(":id/boost")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Roles(UserRole.SELLER)
  @RequireFeature(SubscriptionFeature.BOOST_LISTING)
  async boostProduct(
    @GetTenant("id") tenantId: string,
    @Param("id") productId: string,
    @GetUser("id") userId: string,
    @Query("days") days: number = 7,
  ) {
    return this.productsService.boostProduct(tenantId, productId, userId, days);
  }
}
