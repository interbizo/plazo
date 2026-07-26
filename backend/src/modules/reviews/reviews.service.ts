import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateReviewDto } from "./reviews.dto";
import { CreateReviewReplyDto } from "./review-reply.dto";
import { RatingType } from "@prisma/client";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private notifEvents: NotificationEventsService,
  ) {}

  private async resolveReviewTargets(
    orderId: string,
    productId?: string,
    serviceId?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          select: {
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    let resolvedProductId = productId || null;
    let resolvedServiceId = serviceId || null;

    if (resolvedServiceId) {
      if (order.serviceId !== resolvedServiceId) {
        throw new BadRequestException("Service does not belong to this order");
      }
      resolvedProductId = null;
    } else if (resolvedProductId) {
      const belongsToOrder = order.orderItems.some(
        (item: { productId: string }) => item.productId === resolvedProductId,
      );
      if (!belongsToOrder) {
        throw new BadRequestException("Product does not belong to this order");
      }
      resolvedServiceId = null;
    } else if (order.serviceId) {
      resolvedServiceId = order.serviceId;
    } else if (order.orderItems.length === 1) {
      resolvedProductId = order.orderItems[0].productId;
    } else if (order.orderItems.length > 1) {
      throw new BadRequestException(
        "Please specify which product you want to review",
      );
    }

    return {
      order,
      productId: resolvedProductId,
      serviceId: resolvedServiceId,
    };
  }

  /**
   * Create Review
   * Mendukung 2 mode:
   * 1. Review dengan orderId (legacy, untuk order yang sudah ada)
   * 2. Review langsung ke produk/layanan/seller tanpa order (mode baru)
   */
  async createReview(
    userId: string,
    createReviewDto: CreateReviewDto,
  ) {
    const { orderId, productId, serviceId, sellerId, rating, comment, images } = createReviewDto;

    let receiverId: string;
    let ratingType: RatingType = RatingType.SELLER_RATING;
    let resolvedProductId: string | null = productId || null;
    let resolvedServiceId: string | null = serviceId || null;
    let tenantId: string | null = null;

    if (orderId) {
      // === MODE LEGACY: Review berdasarkan order ===
      const resolved = await this.resolveReviewTargets(orderId, productId, serviceId);
      const order = resolved.order;
      resolvedProductId = resolved.productId;
      resolvedServiceId = resolved.serviceId;
      tenantId = order.tenantId;

      if (order.status !== "COMPLETED") {
        throw new BadRequestException("Cannot review an order that is not completed");
      }

      if (userId === order.buyerId) {
        receiverId = order.sellerId;
        ratingType = RatingType.SELLER_RATING;
      } else if (userId === order.sellerId) {
        receiverId = order.buyerId;
        ratingType = RatingType.BUYER_RATING;
      } else {
        throw new BadRequestException("Not authorized to review this order");
      }
    } else {
      // === MODE BARU: Review berdasarkan ChatTransaction ===
      if (!createReviewDto.chatTransactionId) {
        throw new BadRequestException(
          "Review harus berdasarkan transaksi yang sudah selesai. Silakan pilih transaksi yang ingin direview.",
        );
      }

      const chatTx = await this.prisma.chatTransaction.findUnique({
        where: { id: createReviewDto.chatTransactionId },
      });

      if (!chatTx) {
        throw new BadRequestException("Transaksi tidak ditemukan");
      }

      if (chatTx.buyerId !== userId) {
        throw new BadRequestException("Anda bukan buyer dari transaksi ini");
      }

      if (chatTx.status !== "COMPLETED") {
        throw new BadRequestException(
          "Transaksi belum ditandai selesai oleh seller. Anda belum bisa memberikan review.",
        );
      }

      if (chatTx.reviewId) {
        throw new ConflictException("Transaksi ini sudah pernah direview");
      }

      receiverId = chatTx.sellerId;
      tenantId = chatTx.tenantId;
      resolvedProductId = chatTx.contextType === "product" ? chatTx.contextId : null;
      resolvedServiceId = chatTx.contextType === "service" ? chatTx.contextId : null;
      ratingType = RatingType.SELLER_RATING;
    }

    // Tidak boleh review diri sendiri
    if (userId === receiverId) {
      throw new BadRequestException("Tidak bisa mereview diri sendiri");
    }

    // Check if already reviewed (unique: giverId + productId + serviceId)
    const existingReview = await this.prisma.review.findFirst({
      where: {
        giverId: userId,
        productId: resolvedProductId,
        serviceId: resolvedServiceId,
        ...(orderId && { orderId }),
      },
    });

    if (existingReview) {
      throw new ConflictException("Anda sudah memberikan review untuk item ini");
    }

    const review = await this.prisma.review.create({
      data: {
        orderId: orderId || null,
        productId: resolvedProductId,
        serviceId: resolvedServiceId,
        giverId: userId,
        receiverId,
        rating,
        comment: comment || null,
        images: images || [],
        type: ratingType,
      },
    });

    // Link review to chat transaction if applicable
    if (createReviewDto.chatTransactionId) {
      await this.prisma.chatTransaction.update({
        where: { id: createReviewDto.chatTransactionId },
        data: { reviewId: review.id },
      });
    }

    // Update seller profile rating
    if (ratingType === RatingType.SELLER_RATING) {
      const stats = await this.prisma.review.aggregate({
        where: { receiverId },
        _avg: { rating: true },
        _count: true,
      });

      await this.prisma.sellerProfile.updateMany({
        where: { userId: receiverId },
        data: {
          totalReviews: stats._count,
          averageRating: stats._avg.rating || 0,
        },
      });
    }

    // Auto notification
    if (tenantId) {
      const giver = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      
      const giverName = giver ? `${giver.firstName} ${giver.lastName}` : "Someone";
      
      await this.notifEvents.onReviewCreated({
        tenantId,
        receiverId,
        giverName,
        rating,
        orderId: orderId || null,
      });

      // Additional notification for internal products (platform tenant)
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true },
      });

      if (tenant?.subdomain === "platform") {
        // Get product/service title
        let itemTitle = "Item";
        if (resolvedProductId) {
          const product = await this.prisma.product.findUnique({
            where: { id: resolvedProductId },
            select: { name: true },
          });
          itemTitle = product?.name || "Produk";
        } else if (resolvedServiceId) {
          const service = await this.prisma.service.findUnique({
            where: { id: resolvedServiceId },
            select: { name: true },
          });
          itemTitle = service?.name || "Layanan";
        }

        // Notify all admins about internal product review
        await this.notifEvents.onInternalProductReview({
          tenantId,
          buyerName: giverName,
          itemTitle,
          rating,
          reviewId: review.id,
        });
      }
    }

    return {
      message: "Review submitted successfully",
      review,
    };
  }

  /**
   * Get Reviews for User (Seller/Buyer)
   */
  async getUserReviews(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const where = { receiverId: userId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          giver: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Order Review (if exists)
   */
  async getOrderReview(orderId: string) {
    const review = await this.prisma.review.findFirst({
      where: { orderId },
      include: {
        giver: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!review) {
      throw new BadRequestException("Review not found");
    }

    return { review };
  }

  /**
   * Calculate Trust Score (Enriched)
   * Factors: avg rating, review count, order completion rate, dispute rate, account age, KYC
   */
  async calculateTrustScore(userId: string) {
    const [reviewStats, user, totalOrders, completedOrders, disputedOrders] =
      await Promise.all([
        this.prisma.review.aggregate({
          where: { receiverId: userId },
          _avg: { rating: true },
          _count: true,
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            createdAt: true,
            isEmailVerified: true,
            kycVerifiedAt: true,
            sellerProfile: { select: { level: true } },
          },
        }),
        this.prisma.order.count({ where: { sellerId: userId } }),
        this.prisma.order.count({
          where: { sellerId: userId, status: "COMPLETED" },
        }),
        this.prisma.order.count({
          where: { sellerId: userId, status: "DISPUTED" },
        }),
      ]);

    if (!user) return { score: 0, breakdown: {} };

    const avgRating = reviewStats._avg.rating || 0;
    const reviewCount = reviewStats._count;

    // Rating score (40% weight) — scale 0-40
    const ratingScore = (avgRating / 5) * 40;

    // Review volume score (15% weight) — caps at 50 reviews
    const volumeScore = Math.min(reviewCount / 50, 1) * 15;

    // Completion rate score (20% weight)
    const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0;
    const completionScore = completionRate * 20;

    // Dispute penalty (10% weight) — fewer disputes = higher score
    const disputeRate = totalOrders > 0 ? disputedOrders / totalOrders : 0;
    const disputeScore = (1 - disputeRate) * 10;

    // Account age score (10% weight) — caps at 1 year
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const ageScore = Math.min(accountAgeDays / 365, 1) * 10;

    // KYC bonus (5% weight)
    const kycScore = user.kycVerifiedAt ? 5 : user.isEmailVerified ? 2 : 0;

    const totalScore = Math.round(
      ratingScore +
        volumeScore +
        completionScore +
        disputeScore +
        ageScore +
        kycScore,
    );

    return {
      score: Math.min(totalScore, 100),
      breakdown: {
        ratingScore: Math.round(ratingScore),
        volumeScore: Math.round(volumeScore),
        completionScore: Math.round(completionScore),
        disputeScore: Math.round(disputeScore),
        ageScore: Math.round(ageScore),
        kycScore,
        avgRating: Math.round(avgRating * 100) / 100,
        totalReviews: reviewCount,
        completionRate: Math.round(completionRate * 100),
        totalOrders,
        accountAgeDays,
      },
    };
  }

  /**
   * Get Reviews for a Seller (for product/service detail pages)
   */
  async getSellerReviews(
    sellerId: string,
    page: number = 1,
    limit: number = 10,
    filterRating?: number,
    hasImages?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const baseWhere = {
      receiverId: sellerId,
      type: RatingType.SELLER_RATING,
    };

    // Filtered where (for the list query)
    const filteredWhere: any = { ...baseWhere };
    if (filterRating && filterRating >= 1 && filterRating <= 5) {
      filteredWhere.rating = filterRating;
    }
    if (hasImages) {
      filteredWhere.images = { isEmpty: false };
    }

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: filteredWhere,
        skip,
        take: limit,
        include: {
          giver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          order: {
            select: { id: true, title: true },
          },
          product: {
            select: { id: true, name: true, thumbnail: true },
          },
          service: {
            select: { id: true, name: true, thumbnail: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: filteredWhere }),
      // Stats always use baseWhere (no filter) for overall summary
      this.prisma.review.aggregate({
        where: baseWhere,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // Rating distribution
    const distribution = await this.prisma.review.groupBy({
      by: ["rating"],
      where: baseWhere,
      _count: true,
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d._count;
    });

    return {
      data: reviews,
      summary: {
        averageRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count,
        ratingDistribution,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Reviews for a specific Product
   */
  async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    filterRating?: number,
    hasImages?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const baseWhere = {
      productId,
      type: RatingType.SELLER_RATING,
    };

    const filteredWhere: any = { ...baseWhere };
    if (filterRating && filterRating >= 1 && filterRating <= 5) {
      filteredWhere.rating = filterRating;
    }
    if (hasImages) {
      filteredWhere.images = { isEmpty: false };
    }

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: filteredWhere,
        skip,
        take: limit,
        include: {
          giver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          order: {
            select: { id: true, title: true },
          },
          reply: {
            include: {
              seller: {
                select: { id: true, firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: filteredWhere }),
      this.prisma.review.aggregate({
        where: baseWhere,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const distribution = await this.prisma.review.groupBy({
      by: ["rating"],
      where: baseWhere,
      _count: true,
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d._count;
    });

    return {
      data: reviews,
      summary: {
        averageRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count,
        ratingDistribution,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Reviews for a specific Service
   */
  async getServiceReviews(
    serviceId: string,
    page: number = 1,
    limit: number = 10,
    filterRating?: number,
    hasImages?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const baseWhere = {
      serviceId,
      type: RatingType.SELLER_RATING,
    };

    const filteredWhere: any = { ...baseWhere };
    if (filterRating && filterRating >= 1 && filterRating <= 5) {
      filteredWhere.rating = filterRating;
    }
    if (hasImages) {
      filteredWhere.images = { isEmpty: false };
    }

    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: filteredWhere,
        skip,
        take: limit,
        include: {
          giver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
          order: {
            select: { id: true, title: true },
          },
          reply: {
            include: {
              seller: {
                select: { id: true, firstName: true, lastName: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where: filteredWhere }),
      this.prisma.review.aggregate({
        where: baseWhere,
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const distribution = await this.prisma.review.groupBy({
      by: ["rating"],
      where: baseWhere,
      _count: true,
    });

    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach((d) => {
      ratingDistribution[d.rating] = d._count;
    });

    return {
      data: reviews,
      summary: {
        averageRating: Math.round((stats._avg.rating || 0) * 10) / 10,
        totalReviews: stats._count,
        ratingDistribution,
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Check if user can review an order
   */
  async canReviewOrder(
    userId: string,
    orderId: string,
    productId?: string,
    serviceId?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        status: "COMPLETED",
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (!order) return { canReview: false, reason: "Order not found or not completed" };

    const resolved = await this.resolveReviewTargets(
      orderId,
      productId,
      serviceId,
    );
    const existing = await this.prisma.review.findFirst({
      where: {
        orderId,
        giverId: userId,
        productId: resolved.productId,
        serviceId: resolved.serviceId,
      },
    });

    if (existing) return { canReview: false, reason: "Already reviewed" };

    return { canReview: true };
  }

  // ============ SELLER REVIEW REPLIES ============

  /**
   * Seller replies to a buyer's review
   */
  async replyToReview(sellerId: string, dto: CreateReviewReplyDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: dto.reviewId },
      include: {
        order: { select: { sellerId: true } },
        reply: true,
      },
    });

    if (!review) {
      throw new BadRequestException("Review not found");
    }

    // Only the seller who received the review can reply
    if (review.receiverId !== sellerId) {
      throw new ForbiddenException("You can only reply to reviews you received");
    }

    // Only seller ratings (buyer reviewing seller) can be replied to
    if (review.type !== RatingType.SELLER_RATING) {
      throw new BadRequestException("Can only reply to buyer reviews");
    }

    // Check if already replied
    if (review.reply) {
      throw new ConflictException("You already replied to this review");
    }

    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId: dto.reviewId,
        sellerId,
        message: dto.message,
      },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return { message: "Reply submitted successfully", reply };
  }

  /**
   * Get reply for a specific review
   */
  async getReviewReply(reviewId: string) {
    const reply = await this.prisma.reviewReply.findUnique({
      where: { reviewId },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return { reply: reply || null };
  }
}
