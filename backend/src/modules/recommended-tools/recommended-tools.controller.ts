import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { RecommendedToolsService } from "./recommended-tools.service";
import { CreateRecommendedToolDto, UpdateRecommendedToolDto } from "./recommended-tools.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/recommended-tools")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendedToolsController {
  constructor(private service: RecommendedToolsService) {}

  // ============================================
  // SUPER ADMIN: Full CRUD
  // ============================================

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(
    @GetUser("id") adminId: string,
    @Body() dto: CreateRecommendedToolDto,
  ) {
    return this.service.create(adminId, dto);
  }

  @Get("admin/all")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll() {
    return this.service.findAll(true); // include inactive
  }

  @Get("admin/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findById(@Param("id") id: string) {
    return this.service.findById(id);
  }

  @Put(":id")
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateRecommendedToolDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles(UserRole.SUPER_ADMIN)
  delete(@Param("id") id: string) {
    return this.service.delete(id);
  }

  @Patch(":id/toggle-status")
  @Roles(UserRole.SUPER_ADMIN)
  toggleStatus(@Param("id") id: string) {
    return this.service.toggleStatus(id);
  }

  // ============================================
  // SELLER PREMIUM: Read Only
  // ============================================

  @Get()
  @Roles(UserRole.SELLER)
  getToolsForSeller(@GetUser("id") userId: string) {
    return this.service.getToolsForSeller(userId);
  }

  @Get(":id")
  @Roles(UserRole.SELLER)
  getToolForSeller(
    @GetUser("id") userId: string,
    @Param("id") toolId: string,
  ) {
    return this.service.getToolForSeller(userId, toolId);
  }
}
