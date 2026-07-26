import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./reviews.dto";
import { CreateReviewReplyDto } from "./review-reply.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/reviews")
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async createReview(
    @GetUser("id") userId: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(userId, createReviewDto);
  }

  @Get("seller/:sellerId")
  async getSellerReviews(
    @Param("sellerId") sellerId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("rating") rating?: string,
    @Query("hasImages") hasImages?: string,
  ) {
    return this.reviewsService.getSellerReviews(
      sellerId,
      +page,
      +limit,
      rating ? +rating : undefined,
      hasImages === "true",
    );
  }

  @Get("product/:productId")
  async getProductReviews(
    @Param("productId") productId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("rating") rating?: string,
    @Query("hasImages") hasImages?: string,
  ) {
    return this.reviewsService.getProductReviews(
      productId,
      +page,
      +limit,
      rating ? +rating : undefined,
      hasImages === "true",
    );
  }

  @Get("service/:serviceId")
  async getServiceReviews(
    @Param("serviceId") serviceId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("rating") rating?: string,
    @Query("hasImages") hasImages?: string,
  ) {
    return this.reviewsService.getServiceReviews(
      serviceId,
      +page,
      +limit,
      rating ? +rating : undefined,
      hasImages === "true",
    );
  }

  @Get("user/:userId")
  async getUserReviews(
    @Param("userId") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.reviewsService.getUserReviews(userId, +page, +limit);
  }

  @Get("order/:orderId")
  @UseGuards(JwtAuthGuard)
  async getOrderReview(@Param("orderId") orderId: string) {
    return this.reviewsService.getOrderReview(orderId);
  }

  @Get("can-review/:orderId")
  @UseGuards(JwtAuthGuard)
  async canReviewOrder(
    @GetUser("id") userId: string,
    @Param("orderId") orderId: string,
    @Query("productId") productId?: string,
    @Query("serviceId") serviceId?: string,
  ) {
    return this.reviewsService.canReviewOrder(
      userId,
      orderId,
      productId,
      serviceId,
    );
  }

  @Get("trust-score/:userId")
  async getTrustScore(@Param("userId") userId: string) {
    const score = await this.reviewsService.calculateTrustScore(userId);
    return { userId, trustScore: score };
  }

  // ============ SELLER REVIEW REPLIES ============

  @Post("reply")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async replyToReview(
    @GetUser("id") sellerId: string,
    @Body() dto: CreateReviewReplyDto,
  ) {
    return this.reviewsService.replyToReview(sellerId, dto);
  }

  @Get(":reviewId/reply")
  async getReviewReply(@Param("reviewId") reviewId: string) {
    return this.reviewsService.getReviewReply(reviewId);
  }
}
