import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./categories.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { RolesGuard } from "@common/guards/roles.guard";
import { UserRole } from "@prisma/client";

@Controller("api/categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  async getCategories(
    @Query("type") type?: string,
    @Query("includeInactive") includeInactive?: string
  ) {
    return this.categoriesService.getCategories(
      type, 
      includeInactive === 'true'
    );
  }

  @Get(":id")
  async getCategory(@Param("id") categoryId: string) {
    return this.categoriesService.getCategory(categoryId);
  }

  @Get(":id/breadcrumb")
  async getCategoryBreadcrumb(@Param("id") categoryId: string) {
    return this.categoriesService.getCategoryBreadcrumb(categoryId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.createCategory(createCategoryDto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateCategory(
    @Param("id") categoryId: string,
    @Body() updateCategoryDto: CreateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(categoryId, updateCategoryDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async deleteCategory(@Param("id") categoryId: string) {
    return this.categoriesService.deleteCategory(categoryId);
  }
}
