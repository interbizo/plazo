import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { BuyerUpdateProfileDto } from "./buyer.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";

@Injectable()
export class BuyerService {
  constructor(private prisma: PrismaService) {}

  // ============ DASHBOARD ============

  async getDashboard(userId: string) {
    const [
      /* DISABLED - fitur dihapus
      totalOrders,
      pendingOrders,
      completedOrders,
      disputedOrders,
      totalSpent,
      */
      activeJobs,
      activeProposals,
      unreadNotifications,
      wishlistCount,
      totalReviews,
      /* DISABLED - fitur dihapus
      recentOrders,
      */
      recentJobs,
    ] = await Promise.all([
      /* DISABLED - fitur dihapus
      this.prisma.order.count({ where: { buyerId: userId } }),
      this.prisma.order.count({
        where: { buyerId: userId, status: "PENDING" },
      }),
      this.prisma.order.count({
        where: { buyerId: userId, status: "COMPLETED" },
      }),
      this.prisma.order.count({
        where: { buyerId: userId, status: "DISPUTED" },
      }),
      this.prisma.order.aggregate({
        where: { buyerId: userId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      */
      this.prisma.job.count({
        where: { buyerId: userId, status: "OPEN", deletedAt: null },
      }),
      this.prisma.proposal.count({
        where: { job: { buyerId: userId }, status: "PENDING" },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.wishlist.count({ where: { userId } }),
      this.prisma.review.count({ where: { giverId: userId } }),
      /* DISABLED - fitur dihapus
      this.prisma.order.findMany({
        where: { buyerId: userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
      }),
      */
      this.prisma.job.findMany({
        where: { buyerId: userId, deletedAt: null },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { proposals: true } } },
      }),
    ]);

    return {
      stats: {
        /* DISABLED - fitur dihapus
        totalOrders,
        pendingOrders,
        completedOrders,
        disputedOrders,
        totalSpent: totalSpent._sum.amount || 0,
        */
        totalJobs: activeJobs,
        totalReviews,
        activeProposals,
        unreadNotifications,
        wishlistCount,
      },
      /* DISABLED - fitur dihapus
      recentOrders,
      */
      recentJobs,
    };
  }

  // ============ PROFILE ============

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
        isEmailVerified: true,
        kycStatus: true,
        createdAt: true,
        _count: {
          select: {
            buyerOrders: true,
            postedJobs: true,
            reviewsGiven: true,
            wishlists: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async updateProfile(userId: string, dto: BuyerUpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
        ...(dto.phone && { phone: dto.phone }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.avatar && { avatar: dto.avatar }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city && { city: dto.city }),
        ...(dto.province && { province: dto.province }),
        ...(dto.postalCode && { postalCode: dto.postalCode }),
        ...(dto.whatsappNumber && { whatsappNumber: dto.whatsappNumber }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        bio: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        whatsappNumber: true,
      },
    });
  }

  /* DISABLED - fitur dihapus
  // ============ ORDERS / PURCHASES ============

  async getPurchaseHistory(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { buyerId: userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { seller: { firstName: { contains: search, mode: "insensitive" } } },
        { seller: { lastName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  thumbnail: true,
                  images: true,
                  productType: true,
                  isDigital: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          deliveries: { take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return PaginationHelper.formatResponse(orders, total, page, limit);
  }

  async getOrderDetail(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            sellerProfile: { select: { averageRating: true, level: true } },
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                thumbnail: true,
                images: true,
                productType: true,
                isDigital: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        deliveries: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { createdAt: "asc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
        cancellation: true,
        extension: true,
        dispute: true,
        chatRoom: { select: { id: true } },
        paymentProof: true,
        reviews: {
          where: { giverId: userId },
          select: {
            id: true,
            productId: true,
            serviceId: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) throw new NotFoundException("Order not found");
    const { reviews, ...orderData } = order;
    return {
      ...orderData,
      review: reviews[0] || null,
      hasReviewed: reviews.length > 0,
    };
  }
  */

  // ============ JOBS ============

  async getMyJobs(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { buyerId: userId, deletedAt: null };
    if (status) where.status = status;
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: { select: { proposals: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.job.count({ where }),
    ]);

    return PaginationHelper.formatResponse(jobs, total, page, limit);
  }

  async getJobDetail(userId: string, jobId: string) {
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, buyerId: userId, deletedAt: null },
      include: {
        proposals: {
          where: { deletedAt: null },
          include: {
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                sellerProfile: { select: { averageRating: true, level: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        order: {
          select: { id: true, status: true, amount: true },
        },
        _count: { select: { proposals: true } },
      },
    });

    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  async getJobProposals(
    userId: string,
    jobId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
  ) {
    // Verify job belongs to buyer
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, buyerId: userId, deletedAt: null },
    });
    if (!job) throw new NotFoundException("Job not found");

    const skip = (page - 1) * limit;
    const where: any = { jobId, deletedAt: null };
    if (status) where.status = status;

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              sellerProfile: {
                select: { averageRating: true, level: true, totalOrders: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return PaginationHelper.formatResponse(proposals, total, page, limit);
  }

  /* DISABLED - fitur dihapus
  // ============ SPENDING & FINANCIAL ============

  async getSpendingStats(userId: string, period: string = "30d") {
    const days =
      period === "7d" ? 7 : period === "90d" ? 90 : period === "1y" ? 365 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [completedOrders, pendingEscrow, totalAllTime] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          buyerId: userId,
          status: "COMPLETED",
          completedAt: { gte: since },
        },
        select: { amount: true, completedAt: true },
        orderBy: { completedAt: "asc" },
      }),
      this.prisma.order.aggregate({
        where: {
          buyerId: userId,
          status: { in: ["PENDING", "PROCESSING"] },
          escrowAmount: { not: null },
        },
        _sum: { escrowAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { buyerId: userId, status: "COMPLETED" },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const periodSpent = completedOrders.reduce(
      (sum, o) => sum + (o.amount || 0),
      0,
    );

    // Monthly breakdown
    const monthlyBreakdown: Record<string, number> = {};
    for (const order of completedOrders) {
      if (order.completedAt) {
        const key = `${order.completedAt.getFullYear()}-${String(order.completedAt.getMonth() + 1).padStart(2, "0")}`;
        monthlyBreakdown[key] =
          (monthlyBreakdown[key] || 0) + (order.amount || 0);
      }
    }

    return {
      period,
      periodSpent,
      periodOrders: completedOrders.length,
      pendingEscrow: pendingEscrow._sum.escrowAmount || 0,
      totalAllTimeSpent: totalAllTime._sum.amount || 0,
      totalAllTimeOrders: totalAllTime._count,
      monthlyBreakdown,
    };
  }

  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 10,
    type?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return PaginationHelper.formatResponse(transactions, total, page, limit);
  }
  */

  // ============ REVIEWS ============

  async getMyReviews(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = { giverId: userId };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        include: {
          receiver: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
    ]);

    return PaginationHelper.formatResponse(reviews, total, page, limit);
  }

  async getReceivedReviews(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const where = { receiverId: userId, type: "BUYER_RATING" as const };

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

    return PaginationHelper.formatResponse(reviews, total, page, limit);
  }

  // ============ CUSTOM OFFERS ============

  async getReceivedOffers(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const where = { buyerId: userId };

    const [offers, total] = await Promise.all([
      this.prisma.customOffer.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              sellerProfile: { select: { averageRating: true, level: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customOffer.count({ where }),
    ]);

    return PaginationHelper.formatResponse(offers, total, page, limit);
  }

  /* DISABLED - fitur dihapus
  // ============ DISPUTES ============

  async getMyDisputes(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = { openedById: userId };

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: { id: true, title: true, amount: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return PaginationHelper.formatResponse(disputes, total, page, limit);
  }
  */

  // ============ WISHLIST ============

  async getWishlist(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const where = { userId };

    try {
      const [items, total] = await Promise.all([
        this.prisma.wishlist.findMany({
          where,
          skip,
          take: limit,
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                images: true,
                isPublished: true,
                tenant: { select: { name: true, subdomain: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.wishlist.count({ where }),
      ]);

      // Filter out wishlist items with null/deleted products
      const validItems = items.filter(item => item.product !== null);

      // Clean up orphaned wishlist items (optional, run in background)
      const orphanedIds = items
        .filter(item => item.product === null)
        .map(item => item.id);
      
      if (orphanedIds.length > 0) {
        // Delete orphaned items asynchronously
        this.prisma.wishlist.deleteMany({
          where: { id: { in: orphanedIds } }
        }).catch(err => {
          console.error('Failed to clean up orphaned wishlist items:', err);
        });
      }

      return PaginationHelper.formatResponse(validItems, total - orphanedIds.length, page, limit);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch wishlist: ${errorMessage}`);
    }
  }

  // ============ NOTIFICATIONS ============

  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 10,
    unread?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (unread) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      ...PaginationHelper.formatResponse(notifications, total, page, limit),
      unreadCount,
    };
  }

  async markAllNotificationsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: result.count };
  }

  // ============ CHAT ROOMS ============

  async getChatRooms(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        where: { participants: { some: { id: userId } } },
        skip,
        take: limit,
        include: {
          participants: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              text: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
          order: { select: { id: true, title: true, status: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.chatRoom.count({
        where: { participants: { some: { id: userId } } },
      }),
    ]);

    // Add unread count per room
    const roomsWithUnread = await Promise.all(
      rooms.map(async (room) => {
        const unreadCount = await this.prisma.chatMessage.count({
          where: { roomId: room.id, senderId: { not: userId }, isRead: false },
        });
        return { ...room, unreadCount };
      }),
    );

    return PaginationHelper.formatResponse(roomsWithUnread, total, page, limit);
  }

  // ============ ACTIVITY SUMMARY ============

  async getActivitySummary(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      /* DISABLED - fitur dihapus
      ordersThisMonth,
      */
      jobsPostedThisMonth,
      reviewsGivenThisMonth,
      /* DISABLED - fitur dihapus
      disputesOpen,
      pendingDeliveries,
      */
    ] = await Promise.all([
      /* DISABLED - fitur dihapus
      this.prisma.order.count({
        where: { buyerId: userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      */
      this.prisma.job.count({
        where: {
          buyerId: userId,
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      }),
      this.prisma.review.count({
        where: { giverId: userId, createdAt: { gte: thirtyDaysAgo } },
      }),
      /* DISABLED - fitur dihapus
      this.prisma.dispute.count({
        where: { openedById: userId, status: { in: ["OPEN", "IN_REVIEW"] } },
      }),
      this.prisma.order.count({
        where: {
          buyerId: userId,
          status: "PROCESSING",
          deliveries: { some: { status: "SUBMITTED" } },
        },
      }),
      */
    ]);

    return {
      /* DISABLED - fitur dihapus
      ordersThisMonth,
      */
      jobsPostedThisMonth,
      reviewsGivenThisMonth,
      /* DISABLED - fitur dihapus
      disputesOpen,
      pendingDeliveries,
      */
    };
  }
}
