import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
} from "@nestjs/common";
import { SubscriptionService } from "./subscription.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";
import {
  ChangePlanDto,
  UpdateAutoRenewDto,
  CreatePlanConfigDto,
  UpdatePlanConfigDto,
  CreateAffiliateClaimDto,
  UpdateAffiliateCityDto,
  ReviewAffiliateClaimDto,
  CreatePlatformPaymentAccountDto,
  UpdatePlatformPaymentAccountDto,
  SearchAffiliatorsDto,
} from "./subscription.dto";
import { CreateSubscriptionPaymentDto, ReviewSubscriptionPaymentDto } from "./subscription-payment.dto";

@Controller("api/subscription")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  // ============ PUBLIC ============

  @Get("plans")
  @Roles(UserRole.BUYER, UserRole.SELLER)
  getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get("features")
  @Roles(UserRole.SELLER)
  getMyFeatures(@GetUser("id") userId: string) {
    return this.subscriptionService.getTenantFeatures(userId);
  }

  @Get("features/check/:feature")
  @Roles(UserRole.SELLER)
  checkFeature(
    @GetUser("id") userId: string,
    @Param("feature") feature: string,
  ) {
    return this.subscriptionService.checkFeature(userId, feature);
  }

  // ============ SELLER ============

  @Get("current")
  @Roles(UserRole.SELLER)
  getCurrentSubscription(@GetUser("id") userId: string) {
    return this.subscriptionService.getCurrentSubscription(userId);
  }

  @Get("history")
  @Roles(UserRole.SELLER)
  getHistory(@GetUser("id") userId: string) {
    return this.subscriptionService.getSubscriptionHistory(userId);
  }

  @Post("change-plan")
  @Roles(UserRole.SELLER)
  changePlan(@GetUser("id") userId: string, @Body() dto: ChangePlanDto) {
    return this.subscriptionService.changePlan(userId, dto.plan);
  }

  @Post("cancel")
  @Roles(UserRole.SELLER)
  cancelSubscription(@GetUser("id") userId: string) {
    return this.subscriptionService.cancelSubscription(userId);
  }

  @Put("auto-renew")
  @Roles(UserRole.SELLER)
  updateAutoRenew(
    @GetUser("id") userId: string,
    @Body() dto: UpdateAutoRenewDto,
  ) {
    return this.subscriptionService.updateAutoRenew(userId, dto.autoRenew);
  }

  // ============ SUBSCRIPTION PAYMENT (Manual Transfer) ============

  @Post("payment")
  @Roles(UserRole.SELLER)
  createPayment(
    @GetUser("id") userId: string,
    @Body() dto: CreateSubscriptionPaymentDto,
  ) {
    return this.subscriptionService.createSubscriptionPayment(userId, dto);
  }

  @Get("payments")
  @Roles(UserRole.SELLER)
  getMyPayments(@GetUser("id") userId: string) {
    return this.subscriptionService.getSubscriptionPayments(userId);
  }

  @Get("affiliate/dashboard")
  @Roles(UserRole.SELLER)
  getAffiliateDashboard(@GetUser("id") userId: string) {
    return this.subscriptionService.getAffiliateDashboard(userId);
  }

  @Post("affiliate/claim")
  @Roles(UserRole.SELLER)
  createAffiliateClaim(
    @GetUser("id") userId: string,
    @Body() dto: CreateAffiliateClaimDto,
  ) {
    return this.subscriptionService.createAffiliateClaim(userId, dto);
  }

  @Get("affiliate/search")
  @Roles(UserRole.SELLER)
  searchAffiliators(
    @GetUser("id") userId: string,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("sortBy") sortBy?: "createdAt" | "name" | "subscriptionPlan",
    @Query("sortOrder") sortOrder?: "asc" | "desc",
  ) {
    return this.subscriptionService.searchAffiliators(userId, {
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy,
      sortOrder,
    });
  }

  // ============ ADMIN ============

  @Post("admin/change-plan/:tenantId")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  adminChangePlan(
    @Param("tenantId") tenantId: string,
    @Body() dto: ChangePlanDto,
    @GetUser("id") adminUserId: string,
  ) {
    return this.subscriptionService.adminChangePlan(
      tenantId,
      dto.plan,
      adminUserId,
    );
  }

  @Get("payment-accounts")
  @Roles(UserRole.SELLER)
  getPaymentAccounts() {
    return this.subscriptionService.getPlatformPaymentAccounts();
  }

  // ============ ADMIN: Platform Payment Accounts CRUD ============

  @Get("admin/payment-accounts")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAdminPaymentAccounts() {
    return this.subscriptionService.getAdminPlatformPaymentAccounts();
  }

  @Post("admin/payment-accounts")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createPaymentAccount(@Body() dto: CreatePlatformPaymentAccountDto) {
    return this.subscriptionService.createPlatformPaymentAccount(dto);
  }

  @Put("admin/payment-accounts/:id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updatePaymentAccount(
    @Param("id") id: string,
    @Body() dto: UpdatePlatformPaymentAccountDto,
  ) {
    return this.subscriptionService.updatePlatformPaymentAccount(id, dto);
  }

  @Delete("admin/payment-accounts/:id")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  deletePaymentAccount(@Param("id") id: string) {
    return this.subscriptionService.deletePlatformPaymentAccount(id);
  }

  @Post("admin/check-expired")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  checkExpired() {
    return this.subscriptionService.checkExpiredSubscriptions();
  }

  @Get("admin/payments")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllPayments(@Query("status") status?: string) {
    return this.subscriptionService.getAllSubscriptionPayments(status);
  }

  @Post("admin/payments/:paymentId/review")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewPayment(
    @GetUser("id") adminId: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: ReviewSubscriptionPaymentDto,
  ) {
    return this.subscriptionService.reviewSubscriptionPayment(adminId, paymentId, dto);
  }

  @Get("admin/affiliates")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAdminAffiliates() {
    return this.subscriptionService.getAdminAffiliates();
  }

  @Put("admin/affiliates/:userId/city")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateAffiliateCity(
    @Param("userId") userId: string,
    @Body() dto: UpdateAffiliateCityDto,
    @GetUser("id") adminUserId: string,
  ) {
    return this.subscriptionService.updateAffiliateCityAssignment(
      userId,
      dto,
      adminUserId,
    );
  }

  @Get("admin/affiliate-claims")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAffiliateClaims(@Query("status") status?: string) {
    return this.subscriptionService.getAffiliateClaims(status);
  }

  @Patch("admin/affiliate/claims/:claimId/review")
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewAffiliateClaim(
    @Param("claimId") claimId: string,
    @GetUser("id") adminUserId: string,
    @Body() dto: ReviewAffiliateClaimDto,
  ) {
    return this.subscriptionService.reviewAffiliateClaim(
      claimId,
      adminUserId,
      dto,
    );
  }

  // ============ SUPER ADMIN: Plan Config CRUD ============

  @Get("admin/plans")
  @Roles(UserRole.SUPER_ADMIN)
  getAllPlanConfigs() {
    return this.subscriptionService.getAllPlanConfigs();
  }

  @Get("admin/plans/:id")
  @Roles(UserRole.SUPER_ADMIN)
  getPlanConfig(@Param("id") id: string) {
    return this.subscriptionService.getPlanConfigById(id);
  }

  @Put("admin/plans/:id")
  @Roles(UserRole.SUPER_ADMIN)
  updatePlanConfig(@Param("id") id: string, @Body() body: UpdatePlanConfigDto) {
    return this.subscriptionService.updatePlanConfig(id, body);
  }

  @Post("admin/plans")
  @Roles(UserRole.SUPER_ADMIN)
  createPlanConfig(@Body() dto: CreatePlanConfigDto) {
    return this.subscriptionService.createPlanConfig(dto);
  }

  @Delete("admin/plans/:id")
  @Roles(UserRole.SUPER_ADMIN)
  deletePlanConfig(@Param("id") id: string) {
    return this.subscriptionService.deletePlanConfig(id);
  }
}
