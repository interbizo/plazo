import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto, UpdateTenantDto, UpdateTenantSeoDto, UpdateTenantThemeDto } from "./tenants.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/tenants")
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER, UserRole.BUYER)
  createTenant(@GetUser() user: any, @Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.createTenant(user.id, createTenantDto);
  }

  @Get("my-tenants")
  @UseGuards(JwtAuthGuard)
  getUserTenants(@GetUser() user: any) {
    return this.tenantsService.getUserTenants(user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getTenantById(
    @GetUser("id") userId: string,
    @Param("id") id: string
  ) {
    return this.tenantsService.getTenantById(id, userId);
  }

  @Get(":id/stats")
  @UseGuards(JwtAuthGuard)
  getTenantStats(
    @GetUser("id") userId: string,
    @Param("id") id: string
  ) {
    return this.tenantsService.getTenantStats(id, userId);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  updateTenant(
    @GetUser() user: any,
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(id, user.id, updateTenantDto);
  }

  // Update theme settings
  @Patch(":id/theme")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  updateTenantTheme(
    @GetUser("id") userId: string,
    @Param("id") id: string,
    @Body() updateThemeDto: UpdateTenantThemeDto,
  ) {
    return this.tenantsService.updateTenantTheme(id, userId, updateThemeDto);
  }

  // Admin only: Toggle SEO Active
  @Patch(":id/seo")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateTenantSeo(
    @Param("id") id: string,
    @Body() updateSeoDto: UpdateTenantSeoDto,
  ) {
    return this.tenantsService.updateTenantSeo(id, updateSeoDto);
  }
}
