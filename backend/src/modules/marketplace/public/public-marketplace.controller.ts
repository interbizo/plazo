import { Controller, Get, Post, Query, Param, Req, Ip } from "@nestjs/common";
import { Request } from "express";
import { PublicMarketplaceService } from "./public-marketplace.service";
import { PublicSearchDto } from "./public-marketplace.dto";
import { ViewTrackerService } from "@common/services/view-tracker.service";

@Controller("api/public")
export class PublicMarketplaceController {
  constructor(
    private publicService: PublicMarketplaceService,
    private viewTracker: ViewTrackerService,
  ) {}

  // ============ VIEW TRACKING ============

  @Post("products/:id/view")
  trackProductView(
    @Param("id") id: string,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ip;
    const userId = (req as any).user?.id;
    const counted = this.viewTracker.trackView("product", id, clientIp, userId);
    return { counted };
  }

  @Post("services/:id/view")
  trackServiceView(
    @Param("id") id: string,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ip;
    const userId = (req as any).user?.id;
    const counted = this.viewTracker.trackView("service", id, clientIp, userId);
    return { counted };
  }

  // ============ MARKETPLACE BROWSING ============

  @Get("homepage")
  getHomepage() {
    return this.publicService.getHomepageData();
  }

  @Get("products")
  browseProducts(@Query() query: PublicSearchDto) {
    return this.publicService.browseProducts(query);
  }

  @Get("services")
  browseServices(@Query() query: PublicSearchDto) {
    return this.publicService.browseServices(query);
  }

  @Get("jobs")
  browseJobs(@Query() query: PublicSearchDto) {
    return this.publicService.browseJobs(query);
  }

  @Get("sellers")
  browseSellers(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("search") search?: string,
    @Query("city") city?: string,
  ) {
    return this.publicService.browseSellers(page, limit, search, city);
  }

  @Get("seo/:type/:identifier")
  getSeoMeta(
    @Param("type") type: string,
    @Param("identifier") identifier: string,
  ) {
    return this.publicService.getSeoMeta(type, identifier);
  }

  @Get("products/:slug")
  getProductBySlug(@Param("slug") slug: string) {
    return this.publicService.getPublicProductBySlug(slug);
  }

  @Get("services/:slug")
  getServiceBySlug(@Param("slug") slug: string) {
    return this.publicService.getPublicServiceBySlug(slug);
  }

  @Get("jobs/:slug")
  getJobBySlug(@Param("slug") slug: string) {
    return this.publicService.getPublicJobBySlug(slug);
  }

  // ============ STOREFRONT (per subdomain) ============

  @Get("store/:subdomain")
  getStorefront(@Param("subdomain") subdomain: string) {
    return this.publicService.getStorefront(subdomain);
  }

  @Get("store/:subdomain/products")
  getStoreProducts(
    @Param("subdomain") subdomain: string,
    @Query() query: PublicSearchDto,
  ) {
    return this.publicService.getStoreProducts(subdomain, query);
  }

  @Get("store/:subdomain/products/:slug")
  getStoreProductBySlug(
    @Param("subdomain") subdomain: string,
    @Param("slug") slug: string,
  ) {
    return this.publicService.getStoreProductBySlug(subdomain, slug);
  }

  @Get("store/:subdomain/services")
  getStoreServices(
    @Param("subdomain") subdomain: string,
    @Query() query: PublicSearchDto,
  ) {
    return this.publicService.getStoreServices(subdomain, query);
  }

  @Get("store/:subdomain/services/:slug")
  getStoreServiceBySlug(
    @Param("subdomain") subdomain: string,
    @Param("slug") slug: string,
  ) {
    return this.publicService.getStoreServiceBySlug(subdomain, slug);
  }

  @Get("store/:subdomain/reviews")
  getStoreReviews(
    @Param("subdomain") subdomain: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.publicService.getStoreReviews(subdomain, page, limit);
  }

  @Get("store/:subdomain/pages/:slug")
  getStorePageBySlug(
    @Param("subdomain") subdomain: string,
    @Param("slug") slug: string,
  ) {
    return this.publicService.getStorePageBySlug(subdomain, slug);
  }

  @Get("store/:subdomain/menus")
  getStoreMenus(@Param("subdomain") subdomain: string) {
    return this.publicService.getStoreMenus(subdomain);
  }

  @Get("seller/:userId/portfolio")
  getSellerPortfolio(@Param("userId") userId: string) {
    return this.publicService.getSellerPortfolio(userId);
  }
}

