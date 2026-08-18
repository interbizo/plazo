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
  Res,
  StreamableFile,
  NotFoundException,
  Header,
} from "@nestjs/common";
import { Response } from "express";
import { createReadStream, existsSync } from "fs";
import { join } from "path";
import { AdminService } from "./admin.service";
import {
  AdminUpdateUserDto,
  AdminCreateUserDto,
  AdminUpdateTenantDto,
  AdminModerateListingDto,
  AdminCreateInternalProductDto,
  AdminUpdateInternalProductDto,
  AdminCreateInternalServiceDto,
  AdminUpdateInternalServiceDto,
  AdminBroadcastNotificationDto,
  AdminReviewKycDto,
  AdminProcessWithdrawalDto,
  AdminFeatureStoreDto,
  AdminVerifyStoreDto,
  AdminResolveDisputeDto,
  AdminResolveReportDto,
  AdminCreateCategoryDto,
  AdminUpdateCategoryDto,
  AdminModerateJobDto,
  AdminDeleteReviewDto,
  AdminUpdateSubscriptionDto,
  AdminSetSellerLevelDto,
  AdminBoostListingDto,
  AdminRemoveBoostDto,
  AdminCreatePromotionDto,
  AdminUpdatePromotionDto,
  AdminBulkUserActionDto,
  ChangeUserRoleDto,
  ChangeTenantPlanDto,
} from "./admin.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ============ USER MANAGEMENT ============

  @Get("users")
  listUsers(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("role") role?: UserRole,
    @Query("search") search?: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.adminService.listUsers(page, limit, role, search, isActive);
  }

  @Get("users/:id")
  getUserDetail(@Param("id") id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Post("users")
  @Roles(UserRole.SUPER_ADMIN)
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Put("users/:id")
  updateUser(@Param("id") id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Post("users/:id/ban")
  banUser(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.banUser(id, admin.id);
  }

  @Post("users/:id/unban")
  unbanUser(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.unbanUser(id, admin.id);
  }

  @Get("users/:id/deletion-preview")
  @Roles(UserRole.SUPER_ADMIN)
  getUserDeletionPreview(@Param("id") id: string) {
    return this.adminService.getUserDeletionPreview(id);
  }

  @Delete("users/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deleteUser(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deleteUser(id, admin.id);
  }

  @Put("users/:id/role")
  @Roles(UserRole.SUPER_ADMIN)
  changeUserRole(
    @Param("id") userId: string,
    @Body() dto: ChangeUserRoleDto,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.changeUserRole(userId, dto.role, adminId);
  }

  @Get("users/:id/details")
  @Roles(UserRole.ADMIN)
  getUserDetails(@Param("id") userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  // ============ TENANT MANAGEMENT ============

  @Get("tenants")
  listTenants(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.adminService.listTenants(page, limit, search, isActive);
  }

  @Get("tenants/:id")
  getTenantDetail(@Param("id") id: string) {
    return this.adminService.getTenantDetail(id);
  }

  @Put("tenants/:id")
  updateTenant(
    @Param("id") id: string,
    @Body() dto: AdminUpdateTenantDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.updateTenant(id, dto, admin.id);
  }

  @Post("tenants/:id/suspend")
  suspendTenant(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.suspendTenant(id, admin.id);
  }

  @Post("tenants/:id/activate")
  activateTenant(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.activateTenant(id, admin.id);
  }

  @Put("tenants/:id/subscription")
  @Roles(UserRole.ADMIN)
  changeTenantPlan(
    @Param("id") tenantId: string,
    @Body() dto: ChangeTenantPlanDto,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.changeTenantPlan(tenantId, dto, adminId);
  }

  // ============ LISTING MODERATION ============

  @Get("products")
  listAllProducts(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("isPublished") isPublished?: boolean,
  ) {
    return this.adminService.listAllProducts(page, limit, search, isPublished);
  }

  @Get("services")
  listAllServices(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return this.adminService.listAllServices(page, limit, search);
  }

  @Put("products/:id/moderate")
  moderateProduct(
    @Param("id") id: string,
    @Body() dto: AdminModerateListingDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.moderateProduct(id, dto, admin.id);
  }

  @Put("services/:id/moderate")
  moderateService(
    @Param("id") id: string,
    @Body() dto: AdminModerateListingDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.moderateService(id, dto, admin.id);
  }

  @Delete("products/:id")
  deleteProductAdmin(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deleteProductAdmin(id, admin.id);
  }

  @Delete("services/:id")
  deleteServiceAdmin(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deleteServiceAdmin(id, admin.id);
  }

  @Get("products/internal")
  @Roles(UserRole.SUPER_ADMIN)
  listInternalProducts(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("isPublished") isPublished?: boolean,
  ) {
    return this.adminService.listInternalProducts(
      page,
      limit,
      search,
      isPublished,
    );
  }

  @Get("products/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  getInternalProduct(@Param("id") id: string) {
    return this.adminService.getInternalProduct(id);
  }

  @Post("products/internal")
  @Roles(UserRole.SUPER_ADMIN)
  createInternalProduct(
    @Body() dto: AdminCreateInternalProductDto,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.createInternalProduct(dto, adminId);
  }

  @Put("products/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  updateInternalProduct(
    @Param("id") id: string,
    @Body() dto: AdminUpdateInternalProductDto,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.updateInternalProduct(id, dto, adminId);
  }

  @Delete("products/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deleteInternalProduct(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.deleteInternalProduct(id, adminId);
  }

  @Get("services/internal")
  @Roles(UserRole.SUPER_ADMIN)
  listInternalServices(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("isPublished") isPublished?: boolean,
  ) {
    return this.adminService.listInternalServices(
      page,
      limit,
      search,
      isPublished,
    );
  }

  @Get("services/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  getInternalService(@Param("id") id: string) {
    return this.adminService.getInternalService(id);
  }

  @Post("services/internal")
  @Roles(UserRole.SUPER_ADMIN)
  createInternalService(
    @Body() dto: AdminCreateInternalServiceDto,
    @GetUser("id") adminId: string,
    @Req() req: any,
  ) {
    // Preserve FAQ nested properties from raw body
    if (req.body?.faq !== undefined) {
      dto.faq = req.body.faq;
    }
    return this.adminService.createInternalService(dto, adminId);
  }

  @Put("services/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  updateInternalService(
    @Param("id") id: string,
    @Body() dto: AdminUpdateInternalServiceDto,
    @GetUser("id") adminId: string,
    @Req() req: any,
  ) {
    // Preserve FAQ nested properties from raw body
    if (req.body?.faq !== undefined) {
      dto.faq = req.body.faq;
    }
    return this.adminService.updateInternalService(id, dto, adminId);
  }

  @Delete("services/internal/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deleteInternalService(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.deleteInternalService(id, adminId);
  }

  /* DISABLED - fitur dihapus
  // ============ ORDER MANAGEMENT ============

  @Get("orders")
  listAllOrders(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listAllOrders(page, limit, status);
  }

  @Put("orders/:id/status")
  forceUpdateOrderStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("reason") reason: string,
    @GetUser() admin: any,
  ) {
    return this.adminService.forceUpdateOrderStatus(id, status, admin.id);
  }

  @Post("orders/:id/cancel")
  cancelOrderAdmin(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @GetUser() admin: any,
  ) {
    return this.adminService.cancelOrderAdmin(id, admin.id, reason);
  }
  */

  /* DISABLED - fitur analytics dihapus
  @Get("analytics/platform")
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get("analytics/recent")
  getRecentActivity(@Query("limit") limit?: number) {
    return this.adminService.getRecentActivity(limit);
  }

  @Get("analytics/subscriptions")
  getSubscriptionStats() {
    return this.adminService.getSubscriptionStats();
  }
  */

  // ============ USER & SUBSCRIPTION STATS (tetap aktif) ============

  @Get("stats/roles")
  @Roles(UserRole.ADMIN)
  getRoleStats() {
    return this.adminService.getRoleStats();
  }

  @Get("stats/subscriptions")
  @Roles(UserRole.ADMIN)
  getSubscriptionPlanStats() {
    return this.adminService.getSubscriptionPlanStats();
  }

  // ============ AUDIT LOGS ============

  @Get("audit-logs")
  getAuditLogs(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("entityType") entityType?: string,
    @Query("userId") userId?: string,
  ) {
    return this.adminService.getAuditLogs(page, limit, entityType, userId);
  }

  // ============ BROADCAST ============

  @Post("broadcast")
  broadcastNotification(
    @Body() dto: AdminBroadcastNotificationDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.broadcastNotification(dto, admin.id);
  }

  // ============ KYC MANAGEMENT ============

  @Get("kyc")
  listKycSubmissions(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listKycSubmissions(page, limit, status);
  }

  @Get("kyc/:id")
  getKycDetail(@Param("id") id: string) {
    return this.adminService.getKycDetail(id);
  }

  @Get("kyc/:id/file/:type")
  async getKycFile(
    @Param("id") id: string,
    @Param("type") type: "ktp" | "selfie",
    @GetUser() admin: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileData = await this.adminService.getKycFile(id, type);

    // Mode S3 — file disimpan di object storage, redirect ke URL publik bucket
    if (fileData.externalUrl) {
      return res.redirect(302, fileData.externalUrl);
    }

    // Check if file exists
    if (!existsSync(fileData.filePath)) {
      throw new NotFoundException("File not found");
    }

    // Set appropriate headers
    const ext = fileData.filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    
    res.set({
      'Content-Type': mimeTypes[ext || 'jpeg'] || 'image/jpeg',
      'Content-Disposition': `inline; filename="kyc-${type}-${id}.${ext}"`,
      'Cache-Control': 'private, max-age=3600',
    });

    const file = createReadStream(fileData.filePath);
    return new StreamableFile(file);
  }

  @Put("kyc/:id/review")
  reviewKyc(
    @Param("id") id: string,
    @Body() dto: AdminReviewKycDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.reviewKyc(id, dto, admin.id);
  }

  /* DISABLED - fitur dihapus
  // ============ WITHDRAWAL MANAGEMENT ============

  @Get("withdrawals")
  listWithdrawals(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listWithdrawals(page, limit, status);
  }

  @Put("withdrawals/:id/process")
  processWithdrawal(
    @Param("id") id: string,
    @Body() dto: AdminProcessWithdrawalDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.processWithdrawal(id, dto, admin.id);
  }
  */

  // ============ FEATURED STORE MANAGEMENT ============

  @Get("featured-stores")
  listFeaturedStores() {
    return this.adminService.listFeaturedStores();
  }

  @Put("tenants/:id/feature")
  featureStore(
    @Param("id") id: string,
    @Body() dto: AdminFeatureStoreDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.featureStore(id, dto, admin.id);
  }

  @Put("tenants/:id/verify")
  verifyStore(
    @Param("id") id: string,
    @Body() dto: AdminVerifyStoreDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.verifyStore(id, dto, admin.id);
  }

  @Patch("tenants/:id/seo")
  updateTenantSeo(
    @Param("id") id: string,
    @Body() dto: { isSeoActive: boolean },
    @GetUser() admin: any,
  ) {
    return this.adminService.updateTenantSeo(id, dto, admin.id);
  }

  /* DISABLED - fitur dihapus
  // ============ DISPUTE MANAGEMENT ============

  @Get("disputes")
  listDisputes(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listDisputes(page, limit, status);
  }

  @Get("disputes/:id")
  getDisputeDetail(@Param("id") id: string) {
    return this.adminService.getDisputeDetail(id);
  }

  @Put("disputes/:id/resolve")
  resolveDispute(
    @Param("id") id: string,
    @Body() dto: AdminResolveDisputeDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.resolveDispute(id, dto, admin.id);
  }
  */

  // ============ REPORT MANAGEMENT ============

  @Get("reports")
  listReports(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
    @Query("targetType") targetType?: string,
  ) {
    return this.adminService.listReports(page, limit, status, targetType);
  }

  @Get("reports/:id")
  getReportDetail(@Param("id") id: string) {
    return this.adminService.getReportDetail(id);
  }

  @Put("reports/:id/resolve")
  resolveReport(
    @Param("id") id: string,
    @Body() dto: AdminResolveReportDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.resolveReport(id, dto, admin.id);
  }

  /* DISABLED - fitur dihapus
  // ============ ADVANCED ANALYTICS ============

  @Get("analytics/revenue")
  getRevenueAnalytics(
    @Query("period") period?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.adminService.getRevenueAnalytics(period, startDate, endDate);
  }

  @Get("analytics/users-growth")
  getUsersGrowth(@Query("months") months?: number) {
    return this.adminService.getUsersGrowth(months);
  }

  @Get("analytics/top-sellers")
  getTopSellers(@Query("limit") limit?: number) {
    return this.adminService.getTopSellers(limit);
  }

  @Get("analytics/top-products")
  getTopProducts(@Query("limit") limit?: number) {
    return this.adminService.getTopProducts(limit);
  }
  */

  // ============ CATEGORY MANAGEMENT ============

  @Get("categories")
  @Roles(UserRole.SUPER_ADMIN)
  listCategories(@Query("type") type?: string) {
    return this.adminService.listCategories(type);
  }

  @Post("categories")
  @Roles(UserRole.SUPER_ADMIN)
  createCategory(@Body() dto: AdminCreateCategoryDto, @GetUser() admin: any) {
    return this.adminService.createCategory(dto, admin.id);
  }

  @Put("categories/:id")
  @Roles(UserRole.SUPER_ADMIN)
  updateCategory(
    @Param("id") id: string,
    @Body() dto: AdminUpdateCategoryDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.updateCategory(id, dto, admin.id);
  }

  @Delete("categories/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deleteCategory(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deleteCategory(id, admin.id);
  }

  // ============ JOB MODERATION ============

  @Get("jobs")
  listAllJobs(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.adminService.listAllJobs(page, limit, status, search);
  }

  @Get("jobs/:id")
  getJobDetail(@Param("id") id: string) {
    return this.adminService.getJobDetail(id);
  }

  @Put("jobs/:id/moderate")
  moderateJob(
    @Param("id") id: string,
    @Body() dto: AdminModerateJobDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.moderateJob(id, dto, admin.id);
  }

  @Delete("jobs/:id")
  deleteJobAdmin(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deleteJobAdmin(id, admin.id);
  }

  // ============ PROPOSAL MANAGEMENT ============

  @Get("proposals")
  listAllProposals(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listAllProposals(page, limit, status);
  }

  @Get("proposals/:id")
  getProposalDetail(@Param("id") id: string) {
    return this.adminService.getProposalDetail(id);
  }

  // ============ REVIEW MODERATION ============

  @Get("reviews")
  listAllReviews(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("minRating") minRating?: number,
    @Query("maxRating") maxRating?: number,
  ) {
    return this.adminService.listAllReviews(page, limit, minRating, maxRating);
  }

  @Delete("reviews/:id")
  deleteReviewAdmin(
    @Param("id") id: string,
    @Body() dto: AdminDeleteReviewDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.deleteReviewAdmin(id, admin.id, dto?.reason);
  }

  // ============ CHAT MONITORING ============

  @Get("chats")
  @Roles(UserRole.SUPER_ADMIN)
  listChatRooms(@Query("page") page?: number, @Query("limit") limit?: number) {
    return this.adminService.listChatRooms(page, limit);
  }

  @Get("chats/:roomId/messages")
  @Roles(UserRole.SUPER_ADMIN)
  getChatMessages(
    @Param("roomId") roomId: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.adminService.getChatMessages(roomId, page, limit);
  }

  // ============ SUBSCRIPTION MANAGEMENT ============

  @Get("subscriptions")
  @Roles(UserRole.SUPER_ADMIN)
  listSubscriptions(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("plan") plan?: string,
  ) {
    return this.adminService.listSubscriptions(page, limit, plan);
  }

  /* DISABLED — use /api/subscription/admin/change-plan/:tenantId instead */
  /*
  @Put("subscriptions/:tenantId")
  @Roles(UserRole.SUPER_ADMIN)
  updateTenantSubscription(
    @Param("tenantId") tenantId: string,
    @Body() dto: AdminUpdateSubscriptionDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.updateTenantSubscription(tenantId, dto, admin.id);
  }
  */

  /* DISABLED - fitur dihapus
  // ============ TRANSACTION LEDGER ============

  @Get("transactions")
  @Roles(UserRole.SUPER_ADMIN)
  listTransactions(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("type") type?: string,
    @Query("status") status?: string,
  ) {
    return this.adminService.listTransactions(page, limit, type, status);
  }

  @Get("transactions/:id")
  @Roles(UserRole.SUPER_ADMIN)
  getTransactionDetail(@Param("id") id: string) {
    return this.adminService.getTransactionDetail(id);
  }
  */

  // ============ CUSTOM OFFER OVERSIGHT ============

  @Get("custom-offers")
  listCustomOffers(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: string,
  ) {
    return this.adminService.listCustomOffers(page, limit, status);
  }

  @Post("custom-offers/:id/cancel")
  cancelCustomOffer(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.cancelCustomOffer(id, admin.id);
  }

  // ============ SELLER LEVEL MANAGEMENT ============

  @Put("sellers/:userId/level")
  setSellerLevel(
    @Param("userId") userId: string,
    @Body() dto: AdminSetSellerLevelDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.setSellerLevel(userId, dto, admin.id);
  }

  // ============ BOOST MANAGEMENT ============

  @Get("boosts")
  @Roles(UserRole.SUPER_ADMIN)
  listBoostedListings() {
    return this.adminService.listBoostedListings();
  }

  @Get("boosts/premium-sellers")
  @Roles(UserRole.SUPER_ADMIN)
  listPremiumSellersForBoost(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
  ) {
    return this.adminService.listPremiumSellersForBoost(page, limit, search);
  }

  @Post("boosts")
  @Roles(UserRole.SUPER_ADMIN)
  boostListing(@Body() dto: AdminBoostListingDto, @GetUser() admin: any) {
    return this.adminService.boostListing(dto, admin.id);
  }

  @Post("boosts/remove")
  @Roles(UserRole.SUPER_ADMIN)
  removeBoost(@Body() dto: AdminRemoveBoostDto, @GetUser() admin: any) {
    return this.adminService.removeBoost(dto, admin.id);
  }

  /* DISABLED - fitur dihapus
  // ============ PROMOTION / COUPON ============

  @Get("promotions")
  @Roles(UserRole.SUPER_ADMIN)
  listPromotions(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("isActive") isActive?: boolean,
  ) {
    return this.adminService.listPromotions(page, limit, isActive);
  }

  @Post("promotions")
  @Roles(UserRole.SUPER_ADMIN)
  createPromotion(@Body() dto: AdminCreatePromotionDto, @GetUser() admin: any) {
    return this.adminService.createPromotion(dto, admin.id);
  }

  @Put("promotions/:id")
  @Roles(UserRole.SUPER_ADMIN)
  updatePromotion(
    @Param("id") id: string,
    @Body() dto: AdminUpdatePromotionDto,
    @GetUser() admin: any,
  ) {
    return this.adminService.updatePromotion(id, dto, admin.id);
  }

  @Delete("promotions/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deletePromotion(@Param("id") id: string, @GetUser() admin: any) {
    return this.adminService.deletePromotion(id, admin.id);
  }
  */

  // ============ NOTIFICATION MANAGEMENT ============

  @Get("notifications")
  listAllNotifications(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("type") type?: string,
  ) {
    return this.adminService.listAllNotifications(page, limit, type);
  }

  @Delete("notifications/:id")
  deleteNotification(@Param("id") id: string) {
    return this.adminService.deleteNotification(id);
  }

  @Post("notifications/cleanup")
  @Roles(UserRole.SUPER_ADMIN)
  cleanupOldNotifications(@Body("daysOld") daysOld?: number) {
    return this.adminService.cleanupOldNotifications(daysOld);
  }

  // ============ BULK ACTIONS ============

  @Post("users/bulk")
  @Roles(UserRole.SUPER_ADMIN)
  bulkUserAction(@Body() dto: AdminBulkUserActionDto, @GetUser() admin: any) {
    return this.adminService.bulkUserAction(dto, admin.id);
  }

  // ============ ACTIVITY LOGS ============

  @Get("activity-logs")
  listActivityLogs(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("action") action?: string,
    @Query("userId") userId?: string,
  ) {
    return this.adminService.listActivityLogs(page, limit, action, userId);
  }

  // ============ SYSTEM DASHBOARD ============

  @Get("dashboard")
  getSystemDashboard() {
    return this.adminService.getSystemDashboard();
  }

  // ============ DATABASE BACKUP ============

  @Get("database/stats")
  @Roles(UserRole.SUPER_ADMIN)
  getDatabaseStats() {
    return this.adminService.getDatabaseStats();
  }

  @Post("database/backup")
  @Roles(UserRole.SUPER_ADMIN)
  createDatabaseBackup(@GetUser("id") adminId: string) {
    return this.adminService.createDatabaseBackup(adminId);
  }

  @Get("database/backups")
  @Roles(UserRole.SUPER_ADMIN)
  listDatabaseBackups() {
    return this.adminService.listDatabaseBackups();
  }

  @Get("database/backups/:filename/download")
  @Roles(UserRole.SUPER_ADMIN)
  async downloadDatabaseBackup(
    @Param("filename") filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filepath = await this.adminService.getBackupFilePath(filename);

    if (!existsSync(filepath)) {
      throw new NotFoundException("Backup file not found");
    }

    res.set({
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });

    const file = createReadStream(filepath);
    return new StreamableFile(file);
  }

  @Delete("database/backups/:filename")
  @Roles(UserRole.SUPER_ADMIN)
  deleteDatabaseBackup(
    @Param("filename") filename: string,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.deleteDatabaseBackup(filename, adminId);
  }

  @Post("database/backups/:filename/restore")
  @Roles(UserRole.SUPER_ADMIN)
  restoreDatabaseBackup(
    @Param("filename") filename: string,
    @GetUser("id") adminId: string,
  ) {
    return this.adminService.restoreDatabaseBackup(filename, adminId);
  }

  @Get("database/backup-config")
  @Roles(UserRole.SUPER_ADMIN)
  getBackupConfig() {
    return this.adminService.getBackupConfig();
  }

  @Post("database/backup-config/test-drive")
  @Roles(UserRole.SUPER_ADMIN)
  testGoogleDriveConnection() {
    return this.adminService.testGoogleDriveConnection();
  }

  // ============ DATA EXPORT FOR CRM ============

  @Get("export/users")
  @Roles(UserRole.SUPER_ADMIN)
  @Header('Content-Type', 'application/octet-stream')
  async exportUsers(
    @Query("format") format: "csv" | "excel" = "csv",
    @Res({ passthrough: true }) res: Response,
    @GetUser() admin: any,
  ) {
    try {
      const buffer = await this.adminService.exportUsersData(format);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `users-export-${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      
      res.setHeader('Content-Type', format === 'csv' 
        ? 'text/csv; charset=utf-8' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      return new StreamableFile(buffer);
    } catch (error) {
      console.error('[Admin Controller] Export users error:', error);
      throw error;
    }
  }

  /* DISABLED - fitur dihapus
  // ============ ORDER DETAIL ============

  @Get("orders/:id")
  getOrderDetail(@Param("id") id: string) {
    return this.adminService.getOrderDetail(id);
  }
  */
}
