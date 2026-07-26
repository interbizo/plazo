import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BuyerService } from "./buyer.service";
import { BuyerUpdateProfileDto } from "./buyer.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/buyer")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class BuyerController {
  constructor(private buyerService: BuyerService) {}

  // ============ DASHBOARD ============

  @Get("dashboard")
  getDashboard(@GetUser("id") userId: string) {
    return this.buyerService.getDashboard(userId);
  }

  @Get("activity-summary")
  getActivitySummary(@GetUser("id") userId: string) {
    return this.buyerService.getActivitySummary(userId);
  }

  // ============ PROFILE ============

  @Get("profile")
  getProfile(@GetUser("id") userId: string) {
    return this.buyerService.getProfile(userId);
  }

  @Put("profile")
  updateProfile(
    @GetUser("id") userId: string,
    @Body() dto: BuyerUpdateProfileDto,
  ) {
    return this.buyerService.updateProfile(userId, dto);
  }

  /* DISABLED - fitur dihapus
  // ============ ORDERS / PURCHASES ============

  @Get("purchases")
  getPurchaseHistory(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.buyerService.getPurchaseHistory(
      userId,
      +page,
      +limit,
      status,
      search,
    );
  }

  @Get("purchases/:orderId")
  getOrderDetail(
    @GetUser("id") userId: string,
    @Param("orderId") orderId: string,
  ) {
    return this.buyerService.getOrderDetail(userId, orderId);
  }
  */

  // ============ JOBS ============

  @Get("jobs")
  getMyJobs(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    return this.buyerService.getMyJobs(userId, +page, +limit, status, search);
  }

  @Get("jobs/:jobId")
  getJobDetail(@GetUser("id") userId: string, @Param("jobId") jobId: string) {
    return this.buyerService.getJobDetail(userId, jobId);
  }

  @Get("jobs/:jobId/proposals")
  getJobProposals(
    @GetUser("id") userId: string,
    @Param("jobId") jobId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
  ) {
    return this.buyerService.getJobProposals(
      userId,
      jobId,
      +page,
      +limit,
      status,
    );
  }

  /* DISABLED - fitur dihapus
  // ============ SPENDING & FINANCIAL ============

  @Get("spending")
  getSpendingStats(
    @GetUser("id") userId: string,
    @Query("period") period?: string,
  ) {
    return this.buyerService.getSpendingStats(userId, period);
  }

  @Get("transactions")
  getTransactions(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("type") type?: string,
  ) {
    return this.buyerService.getTransactions(userId, +page, +limit, type);
  }
  */

  // ============ REVIEWS ============

  @Get("reviews/given")
  getMyReviews(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getMyReviews(userId, +page, +limit);
  }

  @Get("reviews/received")
  getReceivedReviews(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getReceivedReviews(userId, +page, +limit);
  }

  // ============ CUSTOM OFFERS ============

  @Get("offers")
  getReceivedOffers(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getReceivedOffers(userId, +page, +limit);
  }

  /* DISABLED - fitur dihapus
  // ============ DISPUTES ============

  @Get("disputes")
  getMyDisputes(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getMyDisputes(userId, +page, +limit);
  }
  */

  // ============ WISHLIST ============

  @Get("wishlist")
  getWishlist(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getWishlist(userId, +page, +limit);
  }

  // ============ NOTIFICATIONS ============

  @Get("notifications")
  getNotifications(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("unread") unread?: string,
  ) {
    return this.buyerService.getNotifications(
      userId,
      +page,
      +limit,
      unread === "true",
    );
  }

  @Post("notifications/mark-all-read")
  markAllNotificationsRead(@GetUser("id") userId: string) {
    return this.buyerService.markAllNotificationsRead(userId);
  }

  // ============ CHAT ============

  @Get("chats")
  getChatRooms(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.buyerService.getChatRooms(userId, +page, +limit);
  }
}
