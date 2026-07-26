import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ServicesService } from "./services.service";
import { CreateServiceDto, UpdateServiceDto } from "./services.dto";
import {
  CreateServicePackageDto,
  UpdateServicePackageDto,
  BulkCreatePackagesDto,
} from "./service-packages.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { FeatureGuard } from "@common/guards/feature.guard";
import { RequireFeature } from "@common/decorators/require-feature.decorator";
import { SubscriptionFeature } from "@common/types/subscription-features.types";
import { Roles } from "@common/decorators/roles.decorator";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/services")
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  createService(
    @GetTenant() tenant: any,
    @GetUser("id") userId: string,
    @Body() createServiceDto: CreateServiceDto,
    @Req() req: any,
  ) {
    // Workaround: class-transformer with whitelist strips nested object properties
    if (req.body?.faq !== undefined) {
      createServiceDto.faq = req.body.faq;
    }
    return this.servicesService.createService(
      tenant.id,
      createServiceDto,
      userId,
    );
  }

  @Get()
  getServices(
    @GetTenant() tenant: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("categoryId") categoryId?: string,
    @Query("search") search?: string,
    @Query("city") city?: string,
  ) {
    return this.servicesService.getServices(
      tenant.id,
      page,
      limit,
      categoryId,
      search,
      city,
    );
  }

  @Get("by-slug/:slug")
  getServiceBySlug(@GetTenant() tenant: any, @Param("slug") slug: string) {
    return this.servicesService.getServiceBySlug(tenant.id, slug);
  }

  @Get(":id")
  getServiceById(@Param("id") id: string) {
    return this.servicesService.getServiceById(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  updateService(
    @GetUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateServiceDto: UpdateServiceDto,
    @Req() req: any,
  ) {
    // Workaround: class-transformer with whitelist strips nested object properties
    // Read faq directly from raw request body to preserve {question, answer} fields
    if (req.body?.faq !== undefined) {
      updateServiceDto.faq = req.body.faq;
    }
    return this.servicesService.updateService(id, userId, updateServiceDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  deleteService(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.servicesService.deleteService(id, userId);
  }

  @Patch(":id/marketplace-visibility")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Roles(UserRole.SELLER)
  @RequireFeature(SubscriptionFeature.PUBLISH_MARKETPLACE)
  toggleMarketplaceVisibility(
    @GetTenant() tenant: any,
    @GetUser("id") userId: string,
    @Param("id") serviceId: string,
    @Body() body: { publish: boolean },
  ) {
    return this.servicesService.toggleMarketplaceVisibility(
      tenant.id,
      userId,
      serviceId,
      body.publish,
    );
  }

  @Post(":id/boost")
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Roles(UserRole.SELLER)
  @RequireFeature(SubscriptionFeature.BOOST_LISTING)
  boostService(
    @Param("id") id: string,
    @GetUser("id") userId: string,
    @Query("days") days: number = 7,
  ) {
    return this.servicesService.boostService(id, userId, days);
  }

  @Get("tenant/my-services")
  @UseGuards(JwtAuthGuard)
  getTenantServices(
    @GetTenant() tenant: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.servicesService.getTenantServices(tenant.id, page, limit);
  }

  // ============ SERVICE PACKAGES ============

  @Post(":id/packages")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  createPackage(
    @Param("id") serviceId: string,
    @GetUser("id") userId: string,
    @Body() dto: CreateServicePackageDto,
  ) {
    return this.servicesService.createPackage(serviceId, userId, dto);
  }

  @Post(":id/packages/bulk")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  bulkCreatePackages(
    @Param("id") serviceId: string,
    @GetUser("id") userId: string,
    @Body() dto: BulkCreatePackagesDto,
  ) {
    return this.servicesService.bulkCreatePackages(serviceId, userId, dto);
  }

  @Put(":serviceId/packages/:packageId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  updatePackage(
    @Param("serviceId") serviceId: string,
    @Param("packageId") packageId: string,
    @GetUser("id") userId: string,
    @Body() dto: UpdateServicePackageDto,
  ) {
    return this.servicesService.updatePackage(
      serviceId,
      packageId,
      userId,
      dto,
    );
  }

  @Delete(":serviceId/packages/:packageId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  deletePackage(
    @Param("serviceId") serviceId: string,
    @Param("packageId") packageId: string,
    @GetUser("id") userId: string,
  ) {
    return this.servicesService.deletePackage(serviceId, packageId, userId);
  }

  @Get(":id/packages")
  getPackages(@Param("id") serviceId: string) {
    return this.servicesService.getPackages(serviceId);
  }
}
