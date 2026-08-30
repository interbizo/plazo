import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CmsService } from "./cms.service";
import {
  CreateCmsPageDto,
  UpdateCmsPageDto,
  UpsertLandingHeroDto,
  CreateLandingBenefitDto,
  UpdateLandingBenefitDto,
  CreateLandingStepDto,
  UpdateLandingStepDto,
  CreateLandingAdvantageDto,
  UpdateLandingAdvantageDto,
  CreateLandingTestimonialDto,
  UpdateLandingTestimonialDto,
  CreateBannerDto,
  UpdateBannerDto,
  UpsertSiteSettingDto,
  BulkUpdateSettingsDto,
  CreateFaqDto,
  UpdateFaqDto,
  CreateFlashSaleDto,
  UpdateFlashSaleDto,
  CreateFlashSaleEventDto,
  UpdateFlashSaleEventDto,
} from "./cms.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

// ============ ADMIN CMS ENDPOINTS ============

@Controller("api/admin/cms")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class CmsAdminController {
  constructor(private cmsService: CmsService) {}

  // --- Landing sections ---

  @Get("landing/hero")
  getLandingHero() {
    return this.cmsService.getLandingHero();
  }

  @Put("landing/hero")
  upsertLandingHero(@Body() dto: UpsertLandingHeroDto) {
    return this.cmsService.upsertLandingHero(dto);
  }

  @Get("landing/benefits")
  listLandingBenefits() {
    return this.cmsService.listLandingBenefits();
  }

  @Post("landing/benefits")
  createLandingBenefit(@Body() dto: CreateLandingBenefitDto) {
    return this.cmsService.createLandingBenefit(dto);
  }

  @Put("landing/benefits/:id")
  updateLandingBenefit(@Param("id") id: string, @Body() dto: UpdateLandingBenefitDto) {
    return this.cmsService.updateLandingBenefit(id, dto);
  }

  @Delete("landing/benefits/:id")
  deleteLandingBenefit(@Param("id") id: string) {
    return this.cmsService.deleteLandingBenefit(id);
  }

  @Get("landing/steps")
  listLandingSteps() {
    return this.cmsService.listLandingSteps();
  }

  @Post("landing/steps")
  createLandingStep(@Body() dto: CreateLandingStepDto) {
    return this.cmsService.createLandingStep(dto);
  }

  @Put("landing/steps/:id")
  updateLandingStep(@Param("id") id: string, @Body() dto: UpdateLandingStepDto) {
    return this.cmsService.updateLandingStep(id, dto);
  }

  @Delete("landing/steps/:id")
  deleteLandingStep(@Param("id") id: string) {
    return this.cmsService.deleteLandingStep(id);
  }

  @Get("landing/advantages")
  listLandingAdvantages() {
    return this.cmsService.listLandingAdvantages();
  }

  @Post("landing/advantages")
  createLandingAdvantage(@Body() dto: CreateLandingAdvantageDto) {
    return this.cmsService.createLandingAdvantage(dto);
  }

  @Put("landing/advantages/:id")
  updateLandingAdvantage(@Param("id") id: string, @Body() dto: UpdateLandingAdvantageDto) {
    return this.cmsService.updateLandingAdvantage(id, dto);
  }

  @Delete("landing/advantages/:id")
  deleteLandingAdvantage(@Param("id") id: string) {
    return this.cmsService.deleteLandingAdvantage(id);
  }

  @Get("landing/testimonials")
  listLandingTestimonials() {
    return this.cmsService.listLandingTestimonials();
  }

  @Post("landing/testimonials")
  createLandingTestimonial(@Body() dto: CreateLandingTestimonialDto) {
    return this.cmsService.createLandingTestimonial(dto);
  }

  @Put("landing/testimonials/:id")
  updateLandingTestimonial(@Param("id") id: string, @Body() dto: UpdateLandingTestimonialDto) {
    return this.cmsService.updateLandingTestimonial(id, dto);
  }

  @Delete("landing/testimonials/:id")
  deleteLandingTestimonial(@Param("id") id: string) {
    return this.cmsService.deleteLandingTestimonial(id);
  }

  // --- Pages ---

  @Get("pages")
  listPages(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.cmsService.listPages(page, limit, status);
  }

  @Get("pages/:id")
  getPage(@Param("id") id: string) {
    return this.cmsService.getPage(id);
  }

  @Post("pages")
  createPage(@Body() dto: CreateCmsPageDto, @GetUser() admin: any) {
    return this.cmsService.createPage(dto, admin.id);
  }

  @Put("pages/:id")
  updatePage(@Param("id") id: string, @Body() dto: UpdateCmsPageDto) {
    return this.cmsService.updatePage(id, dto);
  }

  @Delete("pages/:id")
  deletePage(@Param("id") id: string) {
    return this.cmsService.deletePage(id);
  }

  // --- Banners ---

  @Get("banners")
  listBanners(
    @Query("status") status?: string,
    @Query("position") position?: string,
  ) {
    return this.cmsService.listBanners(status, position);
  }

  @Post("banners")
  createBanner(@Body() dto: CreateBannerDto, @GetUser() admin: any) {
    return this.cmsService.createBanner(dto, admin.id);
  }

  @Put("banners/:id")
  updateBanner(@Param("id") id: string, @Body() dto: UpdateBannerDto) {
    return this.cmsService.updateBanner(id, dto);
  }

  @Delete("banners/:id")
  deleteBanner(@Param("id") id: string) {
    return this.cmsService.deleteBanner(id);
  }

  // --- Site Settings ---

  @Get("settings")
  getSettings(@Query("group") group?: string) {
    return this.cmsService.getSettings(group);
  }

  @Get("settings/:key")
  getSetting(@Param("key") key: string) {
    return this.cmsService.getSetting(key);
  }

  @Put("settings")
  upsertSetting(@Body() dto: UpsertSiteSettingDto, @GetUser() admin: any) {
    return this.cmsService.upsertSetting(dto, admin.id);
  }

  @Put("settings/bulk")
  bulkUpdateSettings(
    @Body() dto: BulkUpdateSettingsDto,
    @GetUser() admin: any,
  ) {
    return this.cmsService.bulkUpdateSettings(dto.settings, admin.id);
  }

  @Delete("settings/:key")
  @Roles(UserRole.SUPER_ADMIN)
  deleteSetting(@Param("key") key: string) {
    return this.cmsService.deleteSetting(key);
  }

  // --- SEO ---

  @Get("seo")
  getSeoDefaults() {
    return this.cmsService.getSeoDefaults();
  }

  @Get("sitemap")
  getSitemap() {
    return this.cmsService.generateSitemap();
  }

  // --- FAQ ---

  @Get("faqs")
  listFaqs(@Query("category") category?: string) {
    return this.cmsService.listFaqs(category);
  }

  @Post("faqs")
  createFaq(@Body() dto: CreateFaqDto) {
    return this.cmsService.createFaq(dto);
  }

  @Put("faqs/:id")
  updateFaq(@Param("id") id: string, @Body() dto: UpdateFaqDto) {
    return this.cmsService.updateFaq(id, dto);
  }

  @Delete("faqs/:id")
  deleteFaq(@Param("id") id: string) {
    return this.cmsService.deleteFaq(id);
  }

  // --- Flash Sale Events ---

  @Get("flash-sale/events")
  listFlashSaleEvents() {
    return this.cmsService.listFlashSaleEvents();
  }

  @Post("flash-sale/events")
  createFlashSaleEvent(@Body() dto: CreateFlashSaleEventDto) {
    return this.cmsService.createFlashSaleEvent(dto);
  }

  @Put("flash-sale/events/:id")
  updateFlashSaleEvent(
    @Param("id") id: string,
    @Body() dto: UpdateFlashSaleEventDto,
  ) {
    return this.cmsService.updateFlashSaleEvent(id, dto);
  }

  @Delete("flash-sale/events/:id")
  deleteFlashSaleEvent(@Param("id") id: string) {
    return this.cmsService.deleteFlashSaleEvent(id);
  }

  // --- Flash Sale Items ---

  @Get("flash-sale")
  listFlashSaleItems(
    @Query("status") status?: string,
    @Query("position") position?: string,
  ) {
    return this.cmsService.listFlashSaleItems(status, position);
  }

  @Post("flash-sale")
  createFlashSaleItem(@Body() dto: CreateFlashSaleDto, @GetUser() admin: any) {
    return this.cmsService.createFlashSaleItem(dto, admin.id);
  }

  @Put("flash-sale/:id")
  updateFlashSaleItem(
    @Param("id") id: string,
    @Body() dto: UpdateFlashSaleDto,
  ) {
    return this.cmsService.updateFlashSaleItem(id, dto);
  }

  @Post("flash-sale/:id/approve")
  approveFlashSaleItem(@Param("id") id: string, @GetUser() admin: any) {
    return this.cmsService.approveFlashSaleItem(id, admin.id);
  }

  @Post("flash-sale/:id/reject")
  rejectFlashSaleItem(
    @Param("id") id: string,
    @Body() body: { reason: string },
  ) {
    return this.cmsService.rejectFlashSaleItem(id, body.reason);
  }

  @Delete("flash-sale/:id")
  deleteFlashSaleItem(@Param("id") id: string) {
    return this.cmsService.deleteFlashSaleItem(id);
  }
}

// ============ PUBLIC CMS ENDPOINTS ============

@Controller("api/public/cms")
export class CmsPublicController {
  constructor(private cmsService: CmsService) {}

  @Get("landing")
  getPublicLandingContent() {
    return this.cmsService.getLandingContent();
  }
  @Get("pages/:slug")
  getPageBySlug(@Param("slug") slug: string) {
    return this.cmsService.getPageBySlug(slug);
  }

  @Get("navigation")
  getNavigation() {
    return this.cmsService.getNavigationPages();
  }

  @Get("banners")
  getActiveBanners(@Query("position") position?: string) {
    return this.cmsService.getActiveBanners(position);
  }

  @Get("banners/fallback")
  getFallbackBanners(@Query("position") position?: string) {
    return this.cmsService.getFallbackBanners(position);
  }

  @Get("seo")
  getSeoDefaults() {
    return this.cmsService.getSeoDefaults();
  }

  @Get("faqs")
  getPublicFaqs(@Query("category") category?: string) {
    return this.cmsService.listFaqs(category, true);
  }

  @Get("flash-sale")
  getActiveFlashSale(@Query("position") position?: string) {
    return this.cmsService.getActiveFlashSaleItems(position);
  }

  @Get("settings")
  getSettings(@Query("group") group?: string) {
    return this.cmsService.getSettings(group);
  }
}
