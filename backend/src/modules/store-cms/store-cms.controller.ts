import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { StoreCmsService } from "./store-cms.service";
import {
  UpdateThemeDto,
  UpdateStoreInfoDto,
  UpdateSocialLinksDto,
  CreateStorePageDto,
  UpdateStorePageDto,
  CreateStoreMenuDto,
  UpdateStoreMenuDto,
  BulkUpdateMenuOrderDto,
} from "./store-cms.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/seller/cms")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
export class StoreCmsController {
  constructor(private service: StoreCmsService) {}

  // ============================================
  // THEME CUSTOMIZATION
  // ============================================

  @Get("theme")
  getTheme(@GetUser("id") userId: string) {
    return this.service.getTheme(userId);
  }

  @Put("theme")
  updateTheme(@GetUser("id") userId: string, @Body() dto: UpdateThemeDto) {
    return this.service.updateTheme(userId, dto);
  }

  // ============================================
  // STORE INFO
  // ============================================

  @Put("store-info")
  updateStoreInfo(
    @GetUser("id") userId: string,
    @Body() dto: UpdateStoreInfoDto,
  ) {
    return this.service.updateStoreInfo(userId, dto);
  }

  @Put("social-links")
  updateSocialLinks(
    @GetUser("id") userId: string,
    @Body() dto: UpdateSocialLinksDto,
  ) {
    return this.service.updateSocialLinks(userId, dto);
  }

  // ============================================
  // STORE PAGES
  // ============================================

  @Post("pages")
  createPage(@GetUser("id") userId: string, @Body() dto: CreateStorePageDto) {
    return this.service.createPage(userId, dto);
  }

  @Get("pages")
  getPages(@GetUser("id") userId: string) {
    return this.service.getPages(userId);
  }

  @Get("pages/:id")
  getPage(@GetUser("id") userId: string, @Param("id") pageId: string) {
    return this.service.getPage(userId, pageId);
  }

  @Put("pages/:id")
  updatePage(
    @GetUser("id") userId: string,
    @Param("id") pageId: string,
    @Body() dto: UpdateStorePageDto,
  ) {
    return this.service.updatePage(userId, pageId, dto);
  }

  @Delete("pages/:id")
  deletePage(@GetUser("id") userId: string, @Param("id") pageId: string) {
    return this.service.deletePage(userId, pageId);
  }

  // ============================================
  // STORE MENU
  // ============================================

  @Post("menus")
  createMenu(@GetUser("id") userId: string, @Body() dto: CreateStoreMenuDto) {
    return this.service.createMenu(userId, dto);
  }

  @Get("menus")
  getMenus(@GetUser("id") userId: string) {
    return this.service.getMenus(userId);
  }

  @Get("menus/:id")
  getMenu(@GetUser("id") userId: string, @Param("id") menuId: string) {
    return this.service.getMenu(userId, menuId);
  }

  @Put("menus/:id")
  updateMenu(
    @GetUser("id") userId: string,
    @Param("id") menuId: string,
    @Body() dto: UpdateStoreMenuDto,
  ) {
    return this.service.updateMenu(userId, menuId, dto);
  }

  @Delete("menus/:id")
  deleteMenu(@GetUser("id") userId: string, @Param("id") menuId: string) {
    return this.service.deleteMenu(userId, menuId);
  }

  @Put("menus/bulk-order")
  bulkUpdateMenuOrder(
    @GetUser("id") userId: string,
    @Body() dto: BulkUpdateMenuOrderDto,
  ) {
    return this.service.bulkUpdateMenuOrder(userId, dto);
  }
}
