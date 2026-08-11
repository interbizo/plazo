import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
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
  AdminUpdateSubscriptionDto,
  AdminSetSellerLevelDto,
  AdminBoostListingDto,
  AdminRemoveBoostDto,
  AdminCreatePromotionDto,
  AdminUpdatePromotionDto,
  AdminBulkUserActionDto,
  ChangeTenantPlanDto,
} from "./admin.dto";
import { PaginationHelper } from "../../common/utils/pagination.helper";
import { StringHelper } from "../../common/utils/string.helper";
import * as bcrypt from "bcryptjs";
import { SellerTier, SubscriptionPlan, UserRole } from "@prisma/client";
import { SubscriptionService } from "../subscription/subscription.service";
import { NotificationEventsService } from "../notifications/notification-events.service";
import { DatabaseBackupService } from "./database-backup.service";
import { Parser } from '@json2csv/plainjs';
import * as ExcelJS from 'exceljs';
import * as path from 'path';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private notificationEvents: NotificationEventsService,
    private backupService: DatabaseBackupService,
  ) {}

  // ============ USER MANAGEMENT ============

  async listUsers(
    page = 1,
    limit = 20,
    role?: UserRole,
    search?: string,
    isActive?: boolean,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      deletedAt: null,
      ...(role && { role }),
      ...(typeof isActive === "boolean" && { isActive }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          sellerProfile: {
            select: { bio: true, level: true },
          },
          tenants: {
            where: { deletedAt: null },
            take: 1,
            select: {
              id: true,
              name: true,
              subdomain: true,
              subscriptionPlan: true,
              sellerTier: true,
            },
          },
          _count: {
            select: {
              buyerOrders: true,
              sellerOrders: true,
              postedJobs: true,
              proposals: true,
              reviewsReceived: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Flatten tenant data for frontend compatibility
    const usersWithTenant = users.map((u: any) => ({
      ...u,
      sellerProfile: u.sellerProfile || undefined,
      tenant: u.tenants?.[0] || undefined,
      tenants: undefined,
    }));

    return PaginationHelper.formatResponse(usersWithTenant, total, page, limit);
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        tenants: {
          select: {
            id: true,
            subdomain: true,
            name: true,
            subscriptionPlan: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            buyerOrders: true,
            sellerOrders: true,
            postedJobs: true,
            proposals: true,
            reviewsGiven: true,
            reviewsReceived: true,
            notifications: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    const {
      password,
      resetToken,
      resetTokenExpiry,
      verificationToken,
      verificationTokenExpiry,
      ...safeUser
    } = user as any;
    return safeUser;
  }

  async createUser(dto: AdminCreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException("Email already registered");

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isEmailVerified: true,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log
    await this.logAction(null, "admin_create_user", "user", user.id, dto);

    return user;
  }

  async updateUser(userId: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    // Build update data, hash password if provided
    const updateData: any = { ...dto };
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete updateData.password;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    await this.logAction(null, "admin_update_user", "user", userId, dto);

    return updated;
  }

  async banUser(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role === "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot ban a Super Admin");
    }

    const banned = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    });

    // Deactivate all tenants of banned user
    await this.prisma.tenant.updateMany({
      where: { ownerId: userId },
      data: { isActive: false },
    });

    await this.logAction(adminId, "ban_user", "user", userId, { banned: true });

    return { message: "User banned successfully", user: banned };
  }

  async unbanUser(userId: string, adminId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: { id: true, email: true, isActive: true },
    });

    await this.logAction(adminId, "unban_user", "user", userId, {
      banned: false,
    });

    return { message: "User unbanned successfully", user: updated };
  }

  async getUserDeletionPreview(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenants: {
          include: {
            _count: {
              select: {
                products: true,
                services: true,
                orders: true,
                jobs: true,
              },
            },
          },
        },
        sellerProfile: true,
        affiliateProfile: true,
        _count: {
          select: {
            buyerOrders: true,
            sellerOrders: true,
            postedJobs: true,
            proposals: true,
            chatMessages: true,
            reviewsGiven: true,
            reviewsReceived: true,
            notifications: true,
            wishlists: true,
            uploads: true,
            transactions: true,
            withdrawals: true,
            reportsFiled: true,
            reportsReceived: true,
            shippingAddresses: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      willBeDeleted: {
        tenants: user.tenants.map((t) => ({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
          products: t._count.products,
          services: t._count.services,
          orders: t._count.orders,
          jobs: t._count.jobs,
        })),
        orders: {
          asBuyer: user._count.buyerOrders,
          asSeller: user._count.sellerOrders,
        },
        jobs: user._count.postedJobs,
        proposals: user._count.proposals,
        chatMessages: user._count.chatMessages,
        reviews: {
          given: user._count.reviewsGiven,
          received: user._count.reviewsReceived,
        },
        notifications: user._count.notifications,
        wishlists: user._count.wishlists,
        uploads: user._count.uploads,
        transactions: user._count.transactions,
        withdrawals: user._count.withdrawals,
        reports: {
          filed: user._count.reportsFiled,
          received: user._count.reportsReceived,
        },
        shippingAddresses: user._count.shippingAddresses,
        profiles: {
          seller: !!user.sellerProfile,
          affiliate: !!user.affiliateProfile,
        },
      },
      warning:
        "This action is IRREVERSIBLE. All data listed above will be permanently deleted.",
    };
  }

  async deleteUser(userId: string, adminId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          tenants: true,
          sellerProfile: true,
          affiliateProfile: true,
          _count: {
            select: {
              buyerOrders: true,
              sellerOrders: true,
              postedJobs: true,
              proposals: true,
            },
          },
        },
      });

      if (!user) throw new NotFoundException("User not found");
      if (user.role === "SUPER_ADMIN") {
        throw new ForbiddenException("Cannot delete a Super Admin");
      }

      // Log what will be deleted for audit trail
      const deletionSummary = {
        userId: user.id,
        email: user.email,
        role: user.role,
        tenants: user.tenants.length,
        buyerOrders: user._count.buyerOrders,
        sellerOrders: user._count.sellerOrders,
        postedJobs: user._count.postedJobs,
        proposals: user._count.proposals,
        hasSellerProfile: !!user.sellerProfile,
        hasAffiliateProfile: !!user.affiliateProfile,
      };

      console.log('[Admin] Deleting user:', deletionSummary);

      // Perform cascade delete in transaction
      await this.prisma.$transaction(async (tx) => {
      try {
        console.log('[Admin] Step 1: Disconnecting from tenant members...');
        // 1. Disconnect user from tenant members (many-to-many relation)
        const memberTenants = await tx.tenant.findMany({
          where: {
            members: {
              some: { id: userId }
            }
          },
          select: { id: true }
        });

        for (const tenant of memberTenants) {
          await tx.tenant.update({
            where: { id: tenant.id },
            data: {
              members: {
                disconnect: { id: userId }
              }
            }
          });
        }

        console.log('[Admin] Step 2: Updating tenant referredBy...');
        // 2. Update tenants referred by this user (set referredBy to null)
        await tx.tenant.updateMany({
          where: { referredBy: userId },
          data: { referredBy: null },
        });

        console.log('[Admin] Step 3: Deleting tenant-related data...');
        // 3. Delete all tenant-related data before deleting tenants
        if (user.tenants.length > 0) {
          const tenantIds = user.tenants.map(t => t.id);
          
          console.log('[Admin] Step 3a: Deleting ChatRooms for tenants...');
          // Delete ChatRooms first (foreign key to Tenant)
          await tx.chatRoom.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3b: Deleting Notifications for tenants...');
          // Delete Notifications (foreign key to Tenant)
          await tx.notification.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3c: Deleting SubscriptionPayments for tenants...');
          // Delete SubscriptionPayments (foreign key to Tenant)
          await tx.subscriptionPayment.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3d: Deleting Subscriptions for tenants...');
          // Delete Subscriptions (foreign key to Tenant)
          await tx.subscription.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3e: Deleting AffiliateBonuses for tenants...');
          // Delete AffiliateBonuses (foreign key to Tenant)
          await tx.affiliateBonus.deleteMany({
            where: { referredTenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3f: Deleting FlashSaleItems for tenants...');
          // Delete FlashSaleItems (foreign key to Tenant)
          await tx.flashSaleItem.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3g: Deleting PaymentAccounts for tenants...');
          // Delete PaymentAccounts (foreign key to Tenant)
          await tx.paymentAccount.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3h: Deleting StorePages for tenants...');
          // Delete StorePages (foreign key to Tenant)
          await tx.storePage.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3i: Deleting StoreMenus for tenants...');
          // Delete StoreMenus (foreign key to Tenant)
          await tx.storeMenu.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3j: Deleting PhysicalVerifications for tenants...');
          // Delete PhysicalVerifications (foreign key to Tenant)
          await tx.physicalVerification.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3k: Deleting Products for tenants...');
          // Delete Products (will cascade to ProductVariants, CartItems, etc.)
          await tx.product.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3l: Deleting Services for tenants...');
          // Delete Services (will cascade to ServicePackages)
          await tx.service.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3m: Deleting Jobs for tenants...');
          // Delete Jobs (will cascade to Proposals)
          await tx.job.deleteMany({
            where: { tenantId: { in: tenantIds } },
          });
          
          console.log('[Admin] Step 3n: Deleting Orders for tenants...');
          // Soft delete Orders for tenants (preserve history)
          await tx.order.updateMany({
            where: { tenantId: { in: tenantIds } },
            data: { deletedAt: new Date() },
          });
          
          console.log('[Admin] Step 3o: Deleting Tenants...');
          // Finally delete tenants
          await tx.tenant.deleteMany({
            where: { ownerId: userId },
          });
        }

        console.log('[Admin] Step 4-5: Soft deleting orders...');
        // 4. Delete orders where user is buyer (soft delete to preserve seller's records)
      await tx.order.updateMany({
        where: { buyerId: userId },
        data: { deletedAt: new Date() },
      });

      // 5. Delete orders where user is seller (soft delete to preserve buyer's records)
      await tx.order.updateMany({
        where: { sellerId: userId },
        data: { deletedAt: new Date() },
      });

      // 6. Delete jobs posted by user
      await tx.job.deleteMany({
        where: { buyerId: userId },
      });

      // 7. Delete proposals by user
      await tx.proposal.deleteMany({
        where: { sellerId: userId },
      });

      console.log('[Admin] Step 8: Disconnecting user from remaining chat rooms...');
      // 8. Disconnect user from remaining chat rooms (many-to-many relation)
      // Note: ChatRooms owned by user's tenants are already deleted in step 3
      const userChatRooms = await tx.chatRoom.findMany({
        where: {
          participants: {
            some: { id: userId }
          }
        },
        select: { id: true }
      });

      for (const room of userChatRooms) {
        await tx.chatRoom.update({
          where: { id: room.id },
          data: {
            participants: {
              disconnect: { id: userId }
            }
          }
        });
      }

      console.log('[Admin] Step 9: Deleting chat messages...');
      // 9. Delete chat messages sent by user
      await tx.chatMessage.deleteMany({
        where: { senderId: userId },
      });

      console.log('[Admin] Step 10: Deleting chat transactions...');
      // 10. Delete chat transactions (buyer or seller)
      await tx.chatTransaction.deleteMany({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      });

      console.log('[Admin] Step 11: Deleting review replies...');
      // 11. Delete ALL review replies linked to reviews that will be deleted
      // First, get all review IDs that belong to this user (given or received)
      const userReviews = await tx.review.findMany({
        where: {
          OR: [{ giverId: userId }, { receiverId: userId }],
        },
        select: { id: true },
      });
      const userReviewIds = userReviews.map(r => r.id);
      
      // Delete replies BY this user
      await tx.reviewReply.deleteMany({
        where: { sellerId: userId },
      });
      
      // Delete replies ON reviews that will be deleted (from other sellers)
      if (userReviewIds.length > 0) {
        await tx.reviewReply.deleteMany({
          where: { reviewId: { in: userReviewIds } },
        });
      }

      console.log('[Admin] Step 12: Deleting reviews...');
      // 12. Delete reviews given and received
      await tx.review.deleteMany({
        where: {
          OR: [{ giverId: userId }, { receiverId: userId }],
        },
      });

      console.log('[Admin] Step 13: Deleting remaining notifications...');
      // 13. Delete remaining notifications (user-specific, not tenant-specific)
      // Note: Tenant notifications are already deleted in step 3
      await tx.notification.deleteMany({
        where: { userId },
      });

      // 14. Delete wishlists
      await tx.wishlist.deleteMany({
        where: { userId },
      });

      // 15. Delete disputes
      await tx.dispute.deleteMany({
        where: { openedById: userId },
      });

      // 16. Delete file uploads
      await tx.fileUpload.deleteMany({
        where: { userId },
      });

      // 17. Delete transactions
      await tx.transaction.deleteMany({
        where: { userId },
      });

      // 18. Delete withdrawals
      await tx.withdrawal.deleteMany({
        where: { userId },
      });

      // 19. Delete report messages
      await tx.reportMessage.deleteMany({
        where: { senderId: userId },
      });

      // 20. Delete reports filed and received
      await tx.report.deleteMany({
        where: {
          OR: [{ reporterId: userId }, { targetUserId: userId }],
        },
      });

      // 21. Delete custom offers
      await tx.customOffer.deleteMany({
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
        },
      });

      // 22. Delete payment verification logs
      await tx.paymentVerificationLog.deleteMany({
        where: { performedBy: userId },
      });

      // 23. Delete payment proofs uploaded by user
      await tx.paymentProof.deleteMany({
        where: { uploadedBy: userId },
      });

      // 24. Update payment proofs verified by user (set verifiedBy to null)
      await tx.paymentProof.updateMany({
        where: { verifiedBy: userId },
        data: { verifiedBy: null },
      });

      // 25. Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId },
      });

      // 26. Delete shipping addresses
      await tx.shippingAddress.deleteMany({
        where: { userId },
      });

      // 27. Delete stock reservations
      await tx.stockReservation.deleteMany({
        where: { userId },
      });

      // 28. Delete cart and cart items
      const userCart = await tx.cart.findUnique({
        where: { userId },
      });
      if (userCart) {
        await tx.cartItem.deleteMany({
          where: { cartId: userCart.id },
        });
        await tx.cart.delete({
          where: { id: userCart.id },
        });
      }

      // 29. Delete affiliate claims and bonuses
      await tx.affiliateClaim.deleteMany({
        where: { affiliateUserId: userId },
      });

      await tx.affiliateBonus.deleteMany({
        where: { affiliateUserId: userId },
      });

      // 30. Delete OTPs
      await tx.oTP.deleteMany({
        where: { userId },
      });

      // 31. Delete KYC submission (will cascade due to schema)
      // 32. Delete seller profile (will cascade due to schema)
      // 33. Delete affiliate profile (will cascade due to schema)

      console.log('[Admin] Step 34: Deleting user...');
      // 34. Finally, delete the user (hard delete)
      await tx.user.delete({
        where: { id: userId },
      });
      
      console.log('[Admin] User deletion completed successfully');
    } catch (txError) {
      console.error('[Admin] Transaction error:', txError);
      console.error('[Admin] Transaction error details:', {
        errorMessage: txError instanceof Error ? txError.message : 'Unknown error',
        errorCode: (txError as any)?.code,
        errorMeta: (txError as any)?.meta,
      });
      
      // Handle specific Prisma errors
      if ((txError as any)?.code === 'P2003') {
        const meta = (txError as any)?.meta;
        const fieldName = meta?.field_name || 'unknown field';
        throw new BadRequestException(
          `Cannot delete user due to foreign key constraint on ${fieldName}. ` +
          `Please contact support if this issue persists.`
        );
      }
      
      throw txError;
    }
    });

    // Log the deletion action
    await this.logAction(adminId, "delete_user", "user", userId, deletionSummary);

    return {
      message: "User and all related data deleted successfully",
      summary: deletionSummary,
    };
  } catch (error) {
    console.error('[Admin Service] Error deleting user:', error);
    console.error('[Admin Service] Error details:', {
      userId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorCode: (error as any)?.code,
      errorMeta: (error as any)?.meta,
    });
    
    // Provide more specific error messages for Prisma errors
    if ((error as any)?.code === 'P2003') {
      const meta = (error as any)?.meta;
      const fieldName = meta?.field_name || 'unknown field';
      const tableName = meta?.table || 'unknown table';
      
      throw new BadRequestException(
        `Cannot delete user due to foreign key constraint. ` +
        `Table: ${tableName}, Field: ${fieldName}. ` +
        `Some related data still exists and must be removed first.`
      );
    }
    
    if ((error as any)?.code === 'P2025') {
      throw new NotFoundException('User not found or already deleted');
    }
    
    // Re-throw other errors
    throw error;
  }
}

  // ============ TENANT MANAGEMENT ============

  async listTenants(page = 1, limit = 20, search?: string, isActive?: boolean) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      deletedAt: null,
      ...(typeof isActive === "boolean" && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { subdomain: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        include: {
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: {
            select: {
              products: true,
              services: true,
              orders: true,
              jobs: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return PaginationHelper.formatResponse(tenants, total, page, limit);
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: {
            products: true,
            services: true,
            orders: true,
            jobs: true,
            chatRooms: true,
            notifications: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException("Tenant not found");

    // Get revenue stats
    const revenue = await this.prisma.order.aggregate({
      where: { tenantId, status: "COMPLETED" },
      _sum: { amount: true },
      _count: true,
    });

    return {
      ...tenant,
      stats: {
        totalRevenue: revenue._sum.amount || 0,
        completedOrders: revenue._count || 0,
      },
    };
  }

  async updateTenant(
    tenantId: string,
    dto: AdminUpdateTenantDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (typeof dto.isActive === "boolean") data.isActive = dto.isActive;
    if (dto.subscriptionPlan) data.subscriptionPlan = dto.subscriptionPlan;
    if (dto.postsLimit) data.postsLimit = dto.postsLimit;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.logAction(
      adminId,
      "admin_update_tenant",
      "tenant",
      tenantId,
      dto,
    );

    return updated;
  }

  async suspendTenant(tenantId: string, adminId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false },
    });

    await this.logAction(adminId, "suspend_tenant", "tenant", tenantId, {});

    return { message: "Tenant suspended successfully" };
  }

  async activateTenant(tenantId: string, adminId: string) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: true },
    });

    await this.logAction(adminId, "activate_tenant", "tenant", tenantId, {});

    return { message: "Tenant activated successfully" };
  }

  // ============ LISTING MODERATION ============

  async listAllProducts(
    page = 1,
    limit = 20,
    search?: string,
    isPublished?: boolean,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      deletedAt: null,
      ...(typeof isPublished === "boolean" && { isPublished }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          tenant: { select: { id: true, subdomain: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return PaginationHelper.formatResponse(products, total, page, limit);
  }

  private async ensureInternalProductTenant(adminId: string) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ ownerId: adminId }, { subdomain: "plazo-official" }],
      },
      orderBy: { createdAt: "asc" },
    });

    if (existingTenant) {
      return existingTenant;
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!admin || admin.role !== "SUPER_ADMIN") {
      throw new ForbiddenException(
        "Hanya super admin yang dapat mengelola produk internal",
      );
    }

    return this.prisma.tenant.create({
      data: {
        ownerId: admin.id,
        subdomain: "plazo-official",
        name: "Plazo Official",
        description:
          "Toko resmi Plazo untuk produk internal yang ditampilkan di website utama.",
        contactEmail: admin.email,
        isActive: true,
        isVerified: true,
        isFeatured: true,
        subscriptionPlan: SubscriptionPlan.ENTERPRISE,
        sellerTier: SellerTier.MEMBER,
        postsLimit: 999999,
        canHighlightProducts: true,
        canPriorityListing: true,
        canAnalyticsAdvanced: true,
      },
    });
  }

  private async assertInternalProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        tenant: {
          include: {
            owner: {
              select: { id: true, role: true },
            },
          },
        },
        variants: {
          include: { options: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException("Produk internal tidak ditemukan");
    }

    if (
      product.tenant.owner.role !== "SUPER_ADMIN" &&
      product.tenant.subdomain !== "plazo-official"
    ) {
      throw new ForbiddenException("Produk ini bukan produk internal platform");
    }

    return product;
  }

  private async validateProductCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException("Kategori tidak ditemukan");
    }

    return category;
  }

  private async generateUniqueInternalProductSlug(
    tenantId: string,
    text: string,
    currentProductId?: string,
  ) {
    const baseSlug = StringHelper.slugify(text);
    let candidate = baseSlug;
    let suffix = 0;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          slug: candidate,
          deletedAt: null,
          ...(currentProductId ? { id: { not: currentProductId } } : {}),
        },
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  private buildInternalProductPayload(
    dto: AdminCreateInternalProductDto | AdminUpdateInternalProductDto,
    tenant: {
      id: string;
      city?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
    slug?: string,
  ) {
    const productData: any = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.price !== undefined ? { price: dto.price } : {}),
      ...(dto.comparePrice !== undefined ? { comparePrice: dto.comparePrice } : {}),
      ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.images !== undefined ? { images: dto.images } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail } : {}),
      ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
      ...(dto.metaDescription !== undefined
        ? { metaDescription: dto.metaDescription }
        : {}),
      productType: dto.productType || "PHYSICAL",
      isDigital: dto.isDigital || false,
      hasVariants: dto.hasVariants || false,
      isPublished: dto.isPublished ?? true,
      publishToMarketplace: dto.publishToMarketplace ?? true,
      city: dto.city ?? tenant.city ?? null,
      latitude: dto.latitude ?? tenant.latitude ?? null,
      longitude: dto.longitude ?? tenant.longitude ?? null,
    };

    if (dto.isDigital) {
      productData.digitalFileUrl = dto.digitalFileUrl;
      productData.digitalFileSize = dto.digitalFileSize;
      productData.digitalFileName = dto.digitalFileName;
      productData.downloadLimit = dto.downloadLimit;
      productData.downloadExpiry = dto.downloadExpiry;
      productData.externalLink = dto.externalLink;
      productData.accessInstructions = dto.accessInstructions;
      productData.licenseKey = dto.licenseKey;
      productData.digitalDeliveryMethod = dto.digitalDeliveryMethod;
      if (dto.stock === undefined) {
        productData.stock = 999999;
      }
    }

    if (dto.hasVariants) {
      productData.stock = 0;
    }

    return productData;
  }

  async listInternalProducts(
    page = 1,
    limit = 20,
    search?: string,
    isPublished?: boolean,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      deletedAt: null,
      tenant: {
        OR: [
          { owner: { role: "SUPER_ADMIN" } },
          { subdomain: "plazo-official" },
        ],
      },
      ...(typeof isPublished === "boolean" && { isPublished }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          tenant: { select: { id: true, name: true, subdomain: true } },
          category: { select: { id: true, name: true } },
          variants: {
            include: { options: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    return PaginationHelper.formatResponse(products, total, page, limit);
  }

  async getInternalProduct(productId: string) {
    const product = await this.assertInternalProduct(productId);
    return { product };
  }

  async createInternalProduct(
    dto: AdminCreateInternalProductDto,
    adminId: string,
  ) {
    if (!dto.categoryId) {
      throw new BadRequestException("Kategori wajib diisi");
    }

    await this.validateProductCategory(dto.categoryId);
    const tenant = await this.ensureInternalProductTenant(adminId);
    const slug = await this.generateUniqueInternalProductSlug(
      tenant.id,
      dto.slug || dto.name,
    );
    const productData = this.buildInternalProductPayload(dto, tenant, slug);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          tenantId: tenant.id,
          ...productData,
        },
      });

      if (dto.hasVariants && dto.variants?.length) {
        await tx.productVariant.createMany({
          data: dto.variants.map((variant, index) => ({
            productId: created.id,
            name: variant.name,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            isActive: true,
            sortOrder: index,
          })),
        });

        const createdVariants = await tx.productVariant.findMany({
          where: { productId: created.id },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });

        for (let index = 0; index < createdVariants.length; index += 1) {
          const variant = createdVariants[index];
          const source = dto.variants[index];
          if (!source?.options?.length) continue;

          await tx.productVariantOption.createMany({
            data: source.options.map((option) => ({
              variantId: variant.id,
              optionName: option.name,
              optionValue: option.value,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: {
          variants: {
            include: { options: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          category: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      });
    });

    await this.logAction(adminId, "create_internal_product", "product", product!.id, {
      tenantId: tenant.id,
      publishToMarketplace: productData.publishToMarketplace,
    });

    return {
      message: "Produk internal berhasil dibuat",
      product,
    };
  }

  async updateInternalProduct(
    productId: string,
    dto: AdminUpdateInternalProductDto,
    adminId: string,
  ) {
    const existingProduct = await this.assertInternalProduct(productId);

    if (dto.categoryId) {
      await this.validateProductCategory(dto.categoryId);
    }

    const slug =
      dto.name || dto.slug
        ? await this.generateUniqueInternalProductSlug(
            existingProduct.tenantId,
            dto.slug || dto.name || existingProduct.name,
            productId,
          )
        : undefined;

    const productData = this.buildInternalProductPayload(dto, existingProduct.tenant, slug);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: productData,
      });

      if (dto.hasVariants === false) {
        await tx.productVariant.deleteMany({
          where: { productId },
        });
      } else if (dto.hasVariants && dto.variants) {
        await tx.productVariant.deleteMany({
          where: { productId },
        });

        const variants = dto.variants;
        for (let index = 0; index < variants.length; index += 1) {
          const variant = variants[index];
          const createdVariant = await tx.productVariant.create({
            data: {
              productId,
              name: variant.name,
              price: variant.price,
              stock: variant.stock,
              sku: variant.sku,
              isActive: true,
              sortOrder: index,
            },
          });

          if (variant.options?.length) {
            await tx.productVariantOption.createMany({
              data: variant.options.map((option) => ({
                variantId: createdVariant.id,
                optionName: option.name,
                optionValue: option.value,
              })),
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          variants: {
            include: { options: true },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
          category: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      });
    });

    await this.logAction(adminId, "update_internal_product", "product", productId, {
      publishToMarketplace: updated?.publishToMarketplace,
      isPublished: updated?.isPublished,
    });

    return {
      message: "Produk internal berhasil diperbarui",
      product: updated,
    };
  }

  async deleteInternalProduct(productId: string, adminId: string) {
    const product = await this.assertInternalProduct(productId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    await this.prisma.cartItem.deleteMany({
      where: { productId },
    });

    await this.logAction(adminId, "delete_internal_product", "product", productId, {
      tenantId: product.tenantId,
      name: product.name,
    });

    return { message: "Produk internal berhasil dihapus" };
  }

  private async assertInternalService(serviceId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        tenant: {
          include: {
            owner: {
              select: { id: true, role: true },
            },
          },
        },
        packages: { orderBy: { tier: "asc" } },
      },
    });

    if (!service || service.deletedAt) {
      throw new NotFoundException("Jasa internal tidak ditemukan");
    }

    if (
      service.tenant.owner.role !== "SUPER_ADMIN" &&
      service.tenant.subdomain !== "plazo-official"
    ) {
      throw new ForbiddenException("Layanan ini bukan jasa internal platform");
    }

    return service;
  }

  private async generateUniqueInternalServiceSlug(
    tenantId: string,
    text: string,
    currentServiceId?: string,
  ) {
    const baseSlug = StringHelper.slugify(text);
    let candidate = baseSlug;
    let suffix = 0;

    while (true) {
      const existing = await this.prisma.service.findFirst({
        where: {
          tenantId,
          slug: candidate,
          deletedAt: null,
          ...(currentServiceId ? { id: { not: currentServiceId } } : {}),
        },
      });

      if (!existing) return candidate;
      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }
  }

  private buildInternalServicePayload(
    dto: AdminCreateInternalServiceDto | AdminUpdateInternalServiceDto,
    tenant: {
      city?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    },
    slug?: string,
  ) {
    return {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
      ...(dto.comparePrice !== undefined ? { comparePrice: dto.comparePrice } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail } : {}),
      ...(dto.gallery !== undefined ? { gallery: dto.gallery } : {}),
      ...(dto.faq !== undefined ? { faq: dto.faq } : {}),
      ...(dto.metaTitle !== undefined ? { metaTitle: dto.metaTitle } : {}),
      ...(dto.metaDescription !== undefined
        ? { metaDescription: dto.metaDescription }
        : {}),
      isPublished: dto.isPublished ?? true,
      publishToMarketplace: dto.publishToMarketplace ?? true,
      city: dto.city ?? tenant.city ?? null,
      latitude: dto.latitude ?? tenant.latitude ?? null,
      longitude: dto.longitude ?? tenant.longitude ?? null,
    };
  }

  async listInternalServices(
    page = 1,
    limit = 20,
    search?: string,
    isPublished?: boolean,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      deletedAt: null,
      tenant: {
        OR: [
          { owner: { role: "SUPER_ADMIN" } },
          { subdomain: "plazo-official" },
        ],
      },
      ...(typeof isPublished === "boolean" && { isPublished }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          tenant: { select: { id: true, name: true, subdomain: true } },
          category: { select: { id: true, name: true } },
          packages: { orderBy: { tier: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({ where }),
    ]);

    return PaginationHelper.formatResponse(services, total, page, limit);
  }

  async getInternalService(serviceId: string) {
    const service = await this.assertInternalService(serviceId);
    return { service };
  }

  async createInternalService(
    dto: AdminCreateInternalServiceDto,
    adminId: string,
  ) {
    if (!dto.categoryId) {
      throw new BadRequestException("Kategori wajib diisi");
    }

    await this.validateProductCategory(dto.categoryId);
    const tenant = await this.ensureInternalProductTenant(adminId);
    const slug = await this.generateUniqueInternalServiceSlug(
      tenant.id,
      dto.slug || dto.name,
    );
    const serviceData = this.buildInternalServicePayload(dto, tenant, slug);

    const service = await this.prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          tenantId: tenant.id,
          name: dto.name,
          description: dto.description,
          basePrice: dto.basePrice,
          categoryId: dto.categoryId,
          ...serviceData,
        },
      });

      if (dto.packages?.length) {
        await tx.servicePackage.createMany({
          data: dto.packages.map((pkg) => ({
            serviceId: created.id,
            tier: pkg.tier,
            title: pkg.title,
            description: pkg.description,
            price: pkg.price,
            deliveryDays: pkg.deliveryDays,
            revisions: pkg.revisions,
            features: pkg.features || [],
          })),
        });
      }

      return tx.service.findUnique({
        where: { id: created.id },
        include: {
          packages: { orderBy: { tier: "asc" } },
          category: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      });
    });

    await this.logAction(adminId, "create_internal_service", "service", service!.id, {
      tenantId: tenant.id,
      publishToMarketplace: serviceData.publishToMarketplace,
      packageCount: dto.packages?.length || 0,
    });

    return {
      message: "Jasa internal berhasil dibuat",
      service,
    };
  }

  async updateInternalService(
    serviceId: string,
    dto: AdminUpdateInternalServiceDto,
    adminId: string,
  ) {
    const existingService = await this.assertInternalService(serviceId);

    if (dto.categoryId) {
      await this.validateProductCategory(dto.categoryId);
    }

    const slug =
      dto.name || dto.slug
        ? await this.generateUniqueInternalServiceSlug(
            existingService.tenantId,
            dto.slug || dto.name || existingService.name,
            serviceId,
          )
        : undefined;

    const serviceData = this.buildInternalServicePayload(
      dto,
      existingService.tenant,
      slug,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: serviceData,
      });

      if (dto.packages) {
        await tx.servicePackage.deleteMany({
          where: { serviceId },
        });

        if (dto.packages.length) {
          await tx.servicePackage.createMany({
            data: dto.packages.map((pkg) => ({
              serviceId,
              tier: pkg.tier,
              title: pkg.title,
              description: pkg.description,
              price: pkg.price,
              deliveryDays: pkg.deliveryDays,
              revisions: pkg.revisions,
              features: pkg.features || [],
            })),
          });
        }
      }

      return tx.service.findUnique({
        where: { id: serviceId },
        include: {
          packages: { orderBy: { tier: "asc" } },
          category: { select: { id: true, name: true } },
          tenant: { select: { id: true, name: true, subdomain: true } },
        },
      });
    });

    await this.logAction(adminId, "update_internal_service", "service", serviceId, {
      publishToMarketplace: updated?.publishToMarketplace,
      isPublished: updated?.isPublished,
      packageCount: dto.packages?.length,
    });

    return {
      message: "Jasa internal berhasil diperbarui",
      service: updated,
    };
  }

  async deleteInternalService(serviceId: string, adminId: string) {
    const service = await this.assertInternalService(serviceId);

    await this.prisma.service.update({
      where: { id: serviceId },
      data: { deletedAt: new Date() },
    });

    await this.logAction(adminId, "delete_internal_service", "service", serviceId, {
      tenantId: service.tenantId,
      name: service.name,
    });

    return { message: "Jasa internal berhasil dihapus" };
  }

  async listAllServices(page = 1, limit = 20, search?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        include: {
          tenant: { select: { id: true, subdomain: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({ where }),
    ]);

    return PaginationHelper.formatResponse(services, total, page, limit);
  }

  async moderateProduct(
    productId: string,
    dto: AdminModerateListingDto,
    adminId: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { isPublished: dto.isPublished },
    });

    await this.logAction(
      adminId,
      dto.isPublished ? "publish_product" : "unpublish_product",
      "product",
      productId,
      { reason: dto.reason },
    );

    // Notify seller
    await this.prisma.notification.create({
      data: {
        tenantId: product.tenantId,
        userId: (await this.prisma.tenant.findUnique({
          where: { id: product.tenantId },
        }))!.ownerId,
        title: dto.isPublished ? "Product Published" : "Product Unpublished",
        message: dto.isPublished
          ? `Your product "${product.name}" has been approved.`
          : `Your product "${product.name}" has been unpublished. Reason: ${dto.reason || "Violation of terms"}`,
        type: "moderation",
        referenceId: productId,
        referenceType: "product",
      },
    });

    return {
      message: `Product ${dto.isPublished ? "published" : "unpublished"}`,
      product: updated,
    };
  }

  async moderateService(
    serviceId: string,
    dto: AdminModerateListingDto,
    adminId: string,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) throw new NotFoundException("Service not found");

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { isPublished: dto.isPublished },
    });

    await this.logAction(
      adminId,
      dto.isPublished ? "publish_service" : "unpublish_service",
      "service",
      serviceId,
      { reason: dto.reason },
    );

    return {
      message: `Service ${dto.isPublished ? "published" : "unpublished"}`,
      service: updated,
    };
  }

  async deleteProductAdmin(productId: string, adminId: string) {
    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date(), isPublished: false },
    });

    await this.logAction(
      adminId,
      "admin_delete_product",
      "product",
      productId,
      {},
    );

    return { message: "Product deleted by admin" };
  }

  async deleteServiceAdmin(serviceId: string, adminId: string) {
    await this.prisma.service.update({
      where: { id: serviceId },
      data: { deletedAt: new Date(), isPublished: false },
    });

    await this.logAction(
      adminId,
      "admin_delete_service",
      "service",
      serviceId,
      {},
    );

    return { message: "Service deleted by admin" };
  }

  // ============ ORDER MANAGEMENT ============

  async listAllOrders(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      deletedAt: null,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: {
          buyer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          seller: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tenant: { select: { id: true, subdomain: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.order.count({ where }),
    ]);

    return PaginationHelper.formatResponse(orders, total, page, limit);
  }

  async forceUpdateOrderStatus(
    orderId: string,
    status: string,
    adminId: string,
  ) {
    // Validate that status is a valid OrderStatus enum value
    const validStatuses = [
      "PENDING_PAYMENT",
      "PAYMENT_UPLOADED",
      "PAYMENT_VERIFIED",
      "PENDING",
      "PROCESSING",
      "DELIVERED",
      "COMPLETED",
      "CANCELLED",
      "DISPUTED",
      "EXPIRED",
    ];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid order status "${status}". Valid statuses: ${validStatuses.join(", ")}`,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException("Order not found");

    // Prevent no-op updates
    if (order.status === status) {
      throw new BadRequestException(`Order is already in ${status} status`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        ...(status === "COMPLETED" && {
          completedAt: new Date(),
          escrowReleasedAt: new Date(),
        }),
      },
    });

    // Restore stock when admin cancels/expires an order
    if (status === "CANCELLED" || status === "EXPIRED") {
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId },
      });
      for (const item of orderItems) {
        if (item.productId) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    // If force-completing, release escrow to seller
    if (status === "COMPLETED") {
      const platformFee = order.amount * 0.1; // 10% platform fee

      // Create escrow release transaction for seller
      await this.prisma.transaction.create({
        data: {
          userId: order.sellerId,
          type: "ESCROW_RELEASE",
          amount: order.amount,
          fee: platformFee,
          netAmount: order.amount - platformFee,
          status: "COMPLETED",
          orderId,
          description: `Admin-released payment for order: ${order.title}`,
        },
      });

      // Create platform fee transaction
      await this.prisma.transaction.create({
        data: {
          userId: order.sellerId,
          type: "PLATFORM_FEE",
          amount: platformFee,
          fee: 0,
          netAmount: platformFee,
          status: "COMPLETED",
          orderId,
          description: `Platform fee for order: ${order.title}`,
        },
      });

      // Update seller profile earnings and order count
      await this.prisma.sellerProfile.updateMany({
        where: { userId: order.sellerId },
        data: {
          totalEarnings: { increment: order.amount - platformFee },
          totalOrders: { increment: 1 },
        },
      });
    }

    await this.logAction(adminId, "admin_update_order", "order", orderId, {
      status,
    });

    // Notify buyer & seller
    const notifData = [
      {
        tenantId: order.tenantId,
        userId: order.buyerId,
        title: "Status Pesanan Diperbarui Admin",
        message: `Status pesanan "${order.title}" diubah admin menjadi ${status}.`,
        type: "order",
        referenceId: orderId,
        referenceType: "order",
      },
      {
        tenantId: order.tenantId,
        userId: order.sellerId,
        title: "Status Pesanan Diperbarui Admin",
        message: `Status pesanan "${order.title}" diubah admin menjadi ${status}.`,
        type: "order",
        referenceId: orderId,
        referenceType: "order",
      },
    ];

    // Use bulkCreateNotifications for realtime WebSocket push
    await this.notificationEvents.bulkCreateNotifications(notifData);

    return { message: `Status pesanan berhasil diubah menjadi ${status}`, order: updated };
  }

  async cancelOrderAdmin(orderId: string, adminId: string, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException("Order not found");

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    // Restore stock for all order items
    for (const item of order.orderItems) {
      if (item.productId) {
        await this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    // Refund escrowed funds to the buyer
    if (order.escrowAmount && order.escrowAmount > 0) {
      await this.prisma.transaction.create({
        data: {
          userId: order.buyerId,
          type: "REFUND",
          amount: order.escrowAmount,
          fee: 0,
          netAmount: order.escrowAmount,
          status: "COMPLETED",
          orderId,
          description: `Admin refund for cancelled order: ${order.title}`,
        },
      });
    }

    // Notify buyer & seller about cancellation
    const notifData = [
      {
        tenantId: order.tenantId,
        userId: order.buyerId,
        title: "Pesanan Dibatalkan Admin",
        message: `Pesanan "${order.title}" dibatalkan oleh admin.${reason ? ` Alasan: ${reason}` : ""} Dana escrow Anda telah dikembalikan.`,
        type: "order",
        referenceId: orderId,
        referenceType: "order",
      },
      {
        tenantId: order.tenantId,
        userId: order.sellerId,
        title: "Pesanan Dibatalkan Admin",
        message: `Pesanan "${order.title}" dibatalkan oleh admin.${reason ? ` Alasan: ${reason}` : ""}`,
        type: "order",
        referenceId: orderId,
        referenceType: "order",
      },
    ];
    
    // Use bulkCreateNotifications for realtime WebSocket push
    await this.notificationEvents.bulkCreateNotifications(notifData);

    await this.logAction(adminId, "admin_cancel_order", "order", orderId, {
      reason,
      refundAmount: order.escrowAmount,
    });

    return { message: "Pesanan berhasil dibatalkan oleh admin", order: updated };
  }

  // ============ PLATFORM ANALYTICS ============

  async getPlatformStats() {
    const [
      totalUsers,
      activeUsers,
      totalSellers,
      totalBuyers,
      totalAdmins,
      totalTenants,
      activeTenants,
      totalProducts,
      totalServices,
      totalJobs,
      totalOrders,
      completedOrders,
      pendingOrders,
      totalRevenue,
      totalReviews,
      avgRating,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.user.count({ where: { role: "SELLER", deletedAt: null } }),
      this.prisma.user.count({ where: { role: "BUYER", deletedAt: null } }),
      this.prisma.user.count({
        where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, deletedAt: null },
      }),
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.service.count({ where: { deletedAt: null } }),
      this.prisma.job.count({ where: { deletedAt: null } }),
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.order.count({
        where: { status: "COMPLETED", deletedAt: null },
      }),
      this.prisma.order.count({
        where: { status: "PENDING", deletedAt: null },
      }),
      this.prisma.order.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      this.prisma.review.count(),
      this.prisma.review.aggregate({ _avg: { rating: true } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        sellers: totalSellers,
        buyers: totalBuyers,
        admins: totalAdmins,
      },
      tenants: {
        total: totalTenants,
        active: activeTenants,
      },
      marketplace: {
        products: totalProducts,
        services: totalServices,
        jobs: totalJobs,
      },
      orders: {
        total: totalOrders,
        completed: completedOrders,
        pending: pendingOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      reviews: {
        total: totalReviews,
        averageRating: Math.round((avgRating._avg.rating || 0) * 100) / 100,
      },
    };
  }

  async getRecentActivity(limit = 20) {
    const perType = Math.ceil(limit / 3);

    const [recentUsers, recentOrders, recentJobs, recentAuditLogs] = await Promise.all([
      this.prisma.user.findMany({
        take: perType,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        take: perType,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          amount: true,
          status: true,
          createdAt: true,
          buyer: { select: { firstName: true, lastName: true } },
          seller: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.job.findMany({
        take: perType,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          budget: true,
          status: true,
          createdAt: true,
          buyer: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        take: perType,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          entityType: true,
          entityId: true,
          userId: true,
          createdAt: true,
        },
      }),
    ]);

    // Flatten into a unified activity feed format
    const activities: Array<{
      id: string;
      type: string;
      message: string;
      createdAt: Date | string;
      user?: { firstName?: string; lastName?: string };
    }> = [];

    for (const u of recentUsers) {
      activities.push({
        id: `user-${u.id}`,
        type: "new_user",
        message: `User baru terdaftar: ${u.firstName || ""} ${u.lastName || ""} (${u.role})`,
        createdAt: u.createdAt,
        user: { firstName: u.firstName || undefined, lastName: u.lastName || undefined },
      });
    }

    for (const o of recentOrders) {
      activities.push({
        id: `order-${o.id}`,
        type: "order",
        message: `Pesanan "${o.title || "Order"}" - ${o.status} (Rp ${o.amount || 0})`,
        createdAt: o.createdAt,
        user: o.buyer ? { firstName: o.buyer.firstName || undefined, lastName: o.buyer.lastName || undefined } : undefined,
      });
    }

    for (const j of recentJobs) {
      activities.push({
        id: `job-${j.id}`,
        type: "job",
        message: `Job "${j.title}" diposting - ${j.status}`,
        createdAt: j.createdAt,
        user: j.buyer ? { firstName: j.buyer.firstName || undefined, lastName: j.buyer.lastName || undefined } : undefined,
      });
    }

    // Fetch user info for audit logs (no Prisma relation)
    const auditUserIds = [...new Set(recentAuditLogs.filter((l) => l.userId).map((l) => l.userId!))];
    const auditUsers = auditUserIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: auditUserIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    const auditUserMap = new Map(auditUsers.map((u) => [u.id, u]));

    for (const log of recentAuditLogs) {
      const logUser = log.userId ? auditUserMap.get(log.userId) : undefined;
      activities.push({
        id: `audit-${log.id}`,
        type: "audit",
        message: `${log.action} pada ${log.entityType}`,
        createdAt: log.createdAt,
        user: logUser ? { firstName: logUser.firstName || undefined, lastName: logUser.lastName || undefined } : undefined,
      });
    }

    // Sort by createdAt descending and take the requested limit
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return activities.slice(0, limit);
  }

  async getSubscriptionStats() {
    const [free, basic, professional, enterprise] = await Promise.all([
      this.prisma.tenant.count({
        where: { subscriptionPlan: "FREE", deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "BASIC", deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "PROFESSIONAL", deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "ENTERPRISE", deletedAt: null },
      }),
    ]);

    return {
      free,
      basic,
      professional,
      enterprise,
      total: free + basic + professional + enterprise,
    };
  }

  // ============ AUDIT LOG ============

  async getAuditLogs(
    page = 1,
    limit = 50,
    entityType?: string,
    userId?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      ...(entityType && { entityType }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Fetch user info for logs that have userId (AuditLog has no Prisma relation to User)
    const userIds = [...new Set(logs.filter((l: any) => l.userId).map((l: any) => l.userId))];
    const users = userIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Map to frontend-expected format (entity, resource, description, details, user)
    const logsWithMapping = logs.map((log: any) => ({
      ...log,
      entity: log.entityType,
      resource: log.entityType,
      description: log.changes ? (typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)) : undefined,
      details: log.changes ? (typeof log.changes === 'string' ? log.changes : JSON.stringify(log.changes)) : undefined,
      user: log.userId ? userMap.get(log.userId) || null : null,
    }));

    return PaginationHelper.formatResponse(logsWithMapping, total, page, limit);
  }

  // ============ BROADCAST NOTIFICATION ============

  async broadcastNotification(
    dto: AdminBroadcastNotificationDto,
    adminId: string,
  ) {
    const where: any = {
      isActive: true,
      deletedAt: null,
      ...(dto.targetRole && { role: dto.targetRole }),
    };

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });

    // Get first tenant or use a system tenant
    const tenant = await this.prisma.tenant.findFirst();
    if (!tenant)
      throw new BadRequestException("No tenant found for notification");

    const notifications = users.map((user) => ({
      tenantId: tenant.id,
      userId: user.id,
      title: dto.title,
      message: dto.message,
      type: "system",
      referenceType: "broadcast",
    }));

    // Use bulkCreateNotifications for realtime WebSocket push
    const created = await this.notificationEvents.bulkCreateNotifications(notifications);

    await this.logAction(
      adminId,
      "broadcast_notification",
      "notification",
      "broadcast",
      {
        targetRole: dto.targetRole,
        recipientCount: created.length,
      },
    );

    return {
      message: `Notification sent to ${created.length} users`,
      count: created.length,
    };
  }

  // ============ ADVANCED USER & ROLE MANAGEMENT ============

  async changeUserRole(userId: string, role: string, adminId: string) {
    if (userId === adminId) {
      throw new ForbiddenException("Cannot change your own role");
    }

    if (role === "SUPER_ADMIN") {
      throw new ForbiddenException(
        "Cannot assign SUPER_ADMIN role. Only one SUPER_ADMIN should exist.",
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    if (user.role === "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot change the role of a SUPER_ADMIN");
    }

    if (user.role === role) {
      throw new BadRequestException(`User is already a ${role}`);
    }

    const previousRole = user.role;

    // If changing SELLER to BUYER: check for active orders first
    if (previousRole === "SELLER" && role === "BUYER") {
      const activeOrders = await this.prisma.order.count({
        where: {
          sellerId: userId,
          status: { in: ["PENDING", "PROCESSING"] },
          deletedAt: null,
        },
      });

      if (activeOrders > 0) {
        throw new BadRequestException(
          `Cannot change role to BUYER: user has ${activeOrders} active order(s). Complete or cancel them first.`,
        );
      }
    }

    // If changing FROM SELLER to any other role: deactivate tenant
    if (previousRole === "SELLER" && role !== "SELLER") {
      await this.prisma.tenant.updateMany({
        where: { ownerId: userId, deletedAt: null },
        data: { isActive: false },
      });
    }

    // Update the user role
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    // If changing BUYER to SELLER: create Tenant + SellerProfile if not exists
    if (
      (previousRole === "BUYER" || previousRole === "ADMIN") &&
      role === "SELLER"
    ) {
      const existingTenant = await this.prisma.tenant.findFirst({
        where: { ownerId: userId, deletedAt: null },
      });

      if (!existingTenant) {
        const subdomain = `store-${user.firstName?.toLowerCase() || "user"}-${Date.now().toString(36)}`;
        await this.prisma.tenant.create({
          data: {
            subdomain,
            name: `${user.firstName || "User"}'s Store`,
            ownerId: userId,
          },
        });
      } else {
        // Reactivate existing tenant if it was deactivated
        if (!existingTenant.isActive) {
          await this.prisma.tenant.update({
            where: { id: existingTenant.id },
            data: { isActive: true },
          });
        }
      }

      const existingProfile = await this.prisma.sellerProfile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        await this.prisma.sellerProfile.create({
          data: { userId },
        });
      }
    }

    // Log the change in AuditLog
    await this.logAction(adminId, "change_user_role", "user", userId, {
      previousRole,
      newRole: role,
    });

    return {
      message: `User role changed from ${previousRole} to ${role}`,
      user: updated,
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        tenants: {
          where: { deletedAt: null },
          include: {
            subscription: true,
            _count: {
              select: {
                products: true,
                services: true,
                orders: true,
                jobs: true,
              },
            },
          },
        },
        _count: {
          select: {
            buyerOrders: true,
            sellerOrders: true,
            postedJobs: true,
            proposals: true,
            reviewsGiven: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    // Get order stats
    const [orderStats, reviewStats] = await Promise.all([
      this.prisma.order.groupBy({
        by: ["status"],
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          deletedAt: null,
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.review.aggregate({
        where: { receiverId: userId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    const {
      password,
      resetToken,
      resetTokenExpiry,
      verificationToken,
      verificationTokenExpiry,
      ...safeUser
    } = user as any;

    return {
      ...safeUser,
      stats: {
        orders: orderStats.map((s) => ({
          status: s.status,
          count: s._count,
          totalAmount: s._sum.amount || 0,
        })),
        reviews: {
          count: reviewStats._count,
          averageRating:
            Math.round((reviewStats._avg.rating || 0) * 100) / 100,
        },
      },
    };
  }

  async changeTenantPlan(
    tenantId: string,
    dto: ChangeTenantPlanDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const result = await this.subscriptionService.adminChangePlan(
      tenantId,
      dto.plan,
      adminId,
    );

    // Log in AuditLog
    await this.logAction(
      adminId,
      "admin_change_tenant_plan",
      "tenant",
      tenantId,
      {
        previousPlan: tenant.subscriptionPlan,
        newPlan: dto.plan,
        reason: dto.reason,
      },
    );

    return result;
  }

  async getRoleStats() {
    const [buyers, sellers, admins, superAdmins] = await Promise.all([
      this.prisma.user.count({
        where: { role: "BUYER", deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: "SELLER", deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: "ADMIN", deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: "SUPER_ADMIN", deletedAt: null },
      }),
    ]);

    return {
      BUYER: buyers,
      SELLER: sellers,
      ADMIN: admins,
      SUPER_ADMIN: superAdmins,
      total: buyers + sellers + admins + superAdmins,
    };
  }

  async getSubscriptionPlanStats() {
    const [free, basic, professional, enterprise] = await Promise.all([
      this.prisma.tenant.count({
        where: { subscriptionPlan: "FREE" as any, deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "BASIC" as any, deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "PROFESSIONAL" as any, deletedAt: null },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: "ENTERPRISE" as any, deletedAt: null },
      }),
    ]);

    // Count by tier
    const [freeTier, memberTier] = await Promise.all([
      this.prisma.tenant.count({
        where: { sellerTier: "FREE", deletedAt: null } as any,
      }),
      this.prisma.tenant.count({
        where: { sellerTier: "MEMBER", deletedAt: null } as any,
      }),
    ]);

    // Total revenue from active subscriptions
    const revenue = await this.prisma.subscription.aggregate({
      where: { isActive: true },
      _sum: { monthlyPrice: true },
    });

    return {
      FREE: free,
      BASIC: basic,
      PROFESSIONAL: professional,
      ENTERPRISE: enterprise,
      sellerTiers: {
        FREE: freeTier,
        MEMBER: memberTier,
      },
      totalMonthlyRevenue: revenue._sum.monthlyPrice || 0,
    };
  }

  // ============ HELPER ============

  private async logAction(
    userId: string | null,
    action: string,
    entityType: string,
    entityId: string,
    changes: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
      },
    });
  }

  // ============ KYC MANAGEMENT ============

  async listKycSubmissions(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { ...(status && { status }) };

    const [submissions, total] = await Promise.all([
      this.prisma.kycSubmission.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.kycSubmission.count({ where }),
    ]);

    return PaginationHelper.formatResponse(submissions, total, page, limit);
  }

  async getKycDetail(id: string) {
    try {
      const kyc = await this.prisma.kycSubmission.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      });
      
      if (!kyc) {
        throw new NotFoundException("KYC submission not found");
      }

      // Decrypt sensitive data for admin review
      const { KycEncryption } = await import('../../common/utils/kyc-encryption.util');
      
      try {
        const decryptedData = {
          ...kyc,
          // Decrypt file paths
          ktpPhotoUrl: `/api/admin/kyc/${id}/file/ktp`,
          selfieWithKtpUrl: `/api/admin/kyc/${id}/file/selfie`,
          // Decrypt personal data (optional - only if admin needs to see)
          fullName: KycEncryption.decryptFullName(kyc.fullNameEncrypted),
          ktpNumber: KycEncryption.maskKtpNumber(
            KycEncryption.decryptKtpNumber(kyc.ktpNumberEncrypted)
          ),
          address: kyc.addressEncrypted ? KycEncryption.decryptAddress(kyc.addressEncrypted) : null,
          dob: kyc.dobEncrypted ? KycEncryption.decryptDob(kyc.dobEncrypted) : null,
        };
        
        return decryptedData;
      } catch (decryptError) {
        console.error('KYC decryption error:', decryptError);
        // Return basic data if decryption fails
        return {
          ...kyc,
          ktpPhotoUrl: `/api/admin/kyc/${id}/file/ktp`,
          selfieWithKtpUrl: `/api/admin/kyc/${id}/file/selfie`,
          decryptionError: 'Failed to decrypt some KYC data',
        };
      }
    } catch (error) {
      console.error('Error fetching KYC detail:', error);
      throw error;
    }
  }

  async reviewKyc(id: string, dto: AdminReviewKycDto, adminId: string) {
    try {
      console.log(`[KYC Review] Starting review for KYC ID: ${id}, Action: ${dto.action}, Admin: ${adminId}`);
      
      const kyc = await this.prisma.kycSubmission.findUnique({ 
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      });
      
      if (!kyc) {
        console.error(`[KYC Review] KYC submission not found: ${id}`);
        throw new NotFoundException("KYC submission not found");
      }

      console.log(`[KYC Review] Found KYC for user: ${kyc.user.email}, Current status: ${kyc.status}`);

      if (dto.action === "approve") {
        console.log(`[KYC Review] Approving KYC for user: ${kyc.userId}`);
        
        try {
          await this.prisma.$transaction([
            this.prisma.kycSubmission.update({
              where: { id },
              data: {
                status: "APPROVED",
                verifiedBy: adminId,
                verifiedAt: new Date(),
              },
            }),
            this.prisma.user.update({
              where: { id: kyc.userId },
              data: { kycStatus: "APPROVED", kycVerifiedAt: new Date() },
            }),
          ]);
          
          console.log(`[KYC Review] Successfully approved KYC for user: ${kyc.userId}`);
        } catch (txError) {
          console.error(`[KYC Review] Transaction error during approval:`, txError);
          const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed';
          throw new BadRequestException(`Failed to approve KYC: ${errorMessage}`);
        }
      } else if (dto.action === "reject") {
        console.log(`[KYC Review] Rejecting KYC for user: ${kyc.userId}, Reason: ${dto.rejectionReason}`);
        
        try {
          await this.prisma.$transaction([
            this.prisma.kycSubmission.update({
              where: { id },
              data: {
                status: "REJECTED",
                rejectionReason: dto.rejectionReason || "Does not meet requirements",
                verifiedBy: adminId,
              },
            }),
            this.prisma.user.update({
              where: { id: kyc.userId },
              data: { kycStatus: "REJECTED" },
            }),
          ]);
          
          console.log(`[KYC Review] Successfully rejected KYC for user: ${kyc.userId}`);
        } catch (txError) {
          console.error(`[KYC Review] Transaction error during rejection:`, txError);
          const errorMessage = txError instanceof Error ? txError.message : 'Transaction failed';
          throw new BadRequestException(`Failed to reject KYC: ${errorMessage}`);
        }
      } else {
        console.error(`[KYC Review] Invalid action: ${dto.action}`);
        throw new BadRequestException(`Invalid action: ${dto.action}. Must be 'approve' or 'reject'`);
      }

      // Log the action
      try {
        await this.logAction(adminId, `kyc_${dto.action}`, "kyc", id, dto);
        console.log(`[KYC Review] Action logged successfully`);
      } catch (logError) {
        console.error(`[KYC Review] Failed to log action:`, logError);
        // Don't throw error if logging fails
      }

      const successMessage = `KYC ${dto.action}d successfully`;
      console.log(`[KYC Review] ${successMessage}`);
      
      return { 
        success: true,
        message: successMessage,
        kycId: id,
        userId: kyc.userId,
        action: dto.action,
      };
    } catch (error) {
      console.error(`[KYC Review] Error reviewing KYC:`, error);
      
      // Return detailed error for debugging
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to review KYC: ${errorMessage}. Please check server logs for details.`
      );
    }
  }

  async getKycFile(id: string, type: "ktp" | "selfie") {
    try {
      console.log(`[KYC File] Fetching ${type} file for KYC ID: ${id}`);
      
      const kyc = await this.prisma.kycSubmission.findUnique({
        where: { id },
        select: {
          ktpPhotoPath: true,
          selfieWithKtpPath: true,
        },
      });

      if (!kyc) {
        console.error(`[KYC File] KYC submission not found: ${id}`);
        throw new NotFoundException("KYC submission not found");
      }

      // Decrypt file path with backward compatibility
      const { KycEncryption } = await import('../../common/utils/kyc-encryption.util');
      
      const encryptedPath = type === "ktp" ? kyc.ktpPhotoPath : kyc.selfieWithKtpPath;
      let filePath: string;
      
      try {
        // Try to decrypt (for new encrypted paths)
        filePath = KycEncryption.decrypt(encryptedPath);
        console.log(`[KYC File] Decrypted file path for ${type}: ${filePath}`);
      } catch (decryptError) {
        // Fallback: assume it's an old unencrypted path
        console.warn(`[KYC File] Decryption failed, assuming unencrypted path (legacy data)`);
        filePath = encryptedPath;
        console.log(`[KYC File] Using unencrypted path for ${type}: ${filePath}`);
      }
      
      // Convert URL to filesystem path if needed
      // Stored paths may be URLs like "http://localhost:3001/uploads/documents/uuid.webp"
      // or relative paths like "/uploads/documents/uuid.webp"
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        try {
          const url = new URL(filePath);
          // Extract path after /uploads/
          const uploadsIndex = url.pathname.indexOf('/uploads/');
          if (uploadsIndex !== -1) {
            const relativePath = url.pathname.substring(uploadsIndex + '/uploads/'.length);
            const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
            filePath = path.join(uploadDir, relativePath);
          }
        } catch (urlError) {
          console.error(`[KYC File] Failed to parse URL: ${filePath}`, urlError);
        }
      } else if (filePath.startsWith('/uploads/')) {
        // Relative path starting with /uploads/
        const relativePath = filePath.substring('/uploads/'.length);
        const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
        filePath = path.join(uploadDir, relativePath);
      }

      console.log(`[KYC File] Resolved file path for ${type}: ${filePath}`);
      
      // Return file path for streaming
      // The controller should handle file streaming with proper headers
      return {
        filePath,
        type,
        kycId: id,
      };
    } catch (error) {
      console.error(`[KYC File] Error fetching KYC file:`, error);
      throw error;
    }
  }

  // ============ WITHDRAWAL MANAGEMENT ============

  async listWithdrawals(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { ...(status && { status }) };

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where }),
    ]);

    return PaginationHelper.formatResponse(withdrawals, total, page, limit);
  }

  async processWithdrawal(
    id: string,
    dto: AdminProcessWithdrawalDto,
    adminId: string,
  ) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
    });
    if (!withdrawal) throw new NotFoundException("Withdrawal not found");
    if (withdrawal.status !== "PENDING") {
      throw new BadRequestException("Withdrawal already processed");
    }

    if (dto.action === "approve") {
      await this.prisma.withdrawal.update({
        where: { id },
        data: {
          status: "APPROVED",
          processedBy: adminId,
          processedAt: new Date(),
        },
      });
    } else {
      // Refund balance
      await this.prisma.$transaction([
        this.prisma.withdrawal.update({
          where: { id },
          data: {
            status: "REJECTED",
            processedBy: adminId,
            processedAt: new Date(),
            adminNotes: dto.reason,
          },
        }),
        this.prisma.sellerProfile.updateMany({
          where: { userId: withdrawal.userId },
          data: { totalEarnings: { increment: withdrawal.amount } },
        }),
      ]);
    }

    await this.logAction(
      adminId,
      `withdrawal_${dto.action}`,
      "withdrawal",
      id,
      dto,
    );

    return { message: `Withdrawal ${dto.action}d successfully` };
  }

  // ============ FEATURED STORE MANAGEMENT ============

  async listFeaturedStores() {
    return this.prisma.tenant.findMany({
      where: { isFeatured: true, isActive: true, deletedAt: null },
      include: {
        owner: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        _count: { select: { products: true, services: true, orders: true } },
      },
      orderBy: { featuredOrder: "asc" },
    });
  }

  async featureStore(
    tenantId: string,
    dto: AdminFeatureStoreDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isFeatured: dto.isFeatured,
        ...(dto.featuredOrder !== undefined && {
          featuredOrder: dto.featuredOrder,
        }),
      },
    });

    await this.logAction(adminId, "feature_store", "tenant", tenantId, dto);

    return {
      message: dto.isFeatured ? "Store featured" : "Store unfeatured",
    };
  }

  async verifyStore(
    tenantId: string,
    dto: AdminVerifyStoreDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isVerified: dto.isVerified,
        verifiedAt: dto.isVerified ? new Date() : null,
      },
    });

    await this.logAction(adminId, "verify_store", "tenant", tenantId, dto);

    return {
      message: dto.isVerified ? "Store verified" : "Store unverified",
    };
  }

  /**
   * Update SEO Active status for a tenant (Admin only)
   * Only verified tenants can have SEO enabled
   */
  async updateTenantSeo(
    tenantId: string,
    dto: { isSeoActive: boolean },
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        subdomain: true,
        name: true,
        isVerified: true,
        isSeoActive: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant is verified before enabling SEO
    if (dto.isSeoActive && !tenant.isVerified) {
      throw new BadRequestException(
        'Cannot enable SEO for unverified tenant. Please verify the tenant first.',
      );
    }

    const now = new Date();
    const updateData: any = {
      isSeoActive: dto.isSeoActive,
    };

    // Track activation/deactivation timestamps
    if (dto.isSeoActive && !tenant.isSeoActive) {
      // Activating SEO
      updateData.seoActivatedAt = now;
    } else if (!dto.isSeoActive && tenant.isSeoActive) {
      // Deactivating SEO
      updateData.seoDeactivatedAt = now;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        subdomain: true,
        name: true,
        isVerified: true,
        isSeoActive: true,
        seoActivatedAt: true,
        seoDeactivatedAt: true,
      },
    });

    // Log admin action
    await this.logAction(
      adminId,
      dto.isSeoActive ? 'enable_seo' : 'disable_seo',
      'tenant',
      tenantId,
      { isSeoActive: dto.isSeoActive },
    );

    console.log(
      `[Admin] ${dto.isSeoActive ? 'Enabled' : 'Disabled'} SEO for tenant: ${tenant.subdomain} by admin: ${adminId}`,
    );

    return {
      success: true,
      message: `SEO ${dto.isSeoActive ? 'enabled' : 'disabled'} successfully for ${tenant.name}`,
      data: updatedTenant,
    };
  }

  // ============ DISPUTE MANAGEMENT ============

  async listDisputes(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { ...(status && { status }) };

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take,
        include: {
          order: {
            select: { id: true, title: true, amount: true, status: true },
          },
          openedBy: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    // Map openedBy to reporter for frontend compatibility
    const disputesWithReporter = disputes.map((d: any) => ({
      ...d,
      reporter: d.openedBy,
    }));

    return PaginationHelper.formatResponse(disputesWithReporter, total, page, limit);
  }

  async getDisputeDetail(id: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        openedBy: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!dispute) throw new NotFoundException("Dispute not found");
    return dispute;
  }

  async resolveDispute(
    id: string,
    dto: AdminResolveDisputeDto,
    adminId: string,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: { order: { include: { orderItems: true } } },
    });
    if (!dispute) throw new NotFoundException("Dispute not found");

    let statusResolution: string;
    if (dto.resolution === "buyer") {
      statusResolution = "RESOLVED_BUYER";
      // Restore stock when resolved in buyer's favor (order will be cancelled)
      if (dispute.order?.orderItems) {
        for (const item of dispute.order.orderItems) {
          if (item.productId) {
            await this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      // Record refund transaction for buyer
      if (dispute.order) {
        await this.prisma.transaction.create({
          data: {
            userId: dispute.order.buyerId,
            orderId: dispute.orderId,
            type: "REFUND",
            amount: dispute.order.escrowAmount || dispute.order.amount,
            netAmount: dispute.order.escrowAmount || dispute.order.amount,
            status: "COMPLETED",
            description: "Dispute resolved in buyer favor",
          },
        });
      }
    } else if (dto.resolution === "seller") {
      statusResolution = "RESOLVED_SELLER";
      // Release to seller
      if (dispute.order) {
        await this.prisma.transaction.create({
          data: {
            userId: dispute.order.sellerId,
            orderId: dispute.orderId,
            type: "ESCROW_RELEASE",
            amount: dispute.order.escrowAmount || dispute.order.amount,
            netAmount: dispute.order.escrowAmount || dispute.order.amount,
            status: "COMPLETED",
            description: "Dispute resolved in seller favor",
          },
        });
      }
    } else {
      statusResolution = "CLOSED";
    }

    await this.prisma.dispute.update({
      where: { id },
      data: {
        status: statusResolution as any,
        adminNotes: dto.adminNotes,
        resolvedAt: new Date(),
      },
    });

    if (dispute.order) {
      await this.prisma.order.update({
        where: { id: dispute.orderId },
        data: {
          status: dto.resolution === "buyer" ? "CANCELLED" : "COMPLETED",
        },
      });
    }

    await this.logAction(adminId, "resolve_dispute", "dispute", id, dto);

    return { message: "Dispute resolved" };
  }

  // ============ REPORT MANAGEMENT ============

  async listReports(
    page = 1,
    limit = 20,
    status?: string,
    targetType?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      ...(status && { status }),
      ...(targetType && { targetType }),
    };

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        include: {
          reporter: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          targetUser: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return PaginationHelper.formatResponse(reports, total, page, limit);
  }

  async getReportDetail(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        targetUser: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async resolveReport(id: string, dto: AdminResolveReportDto, adminId: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException("Report not found");

    await this.prisma.report.update({
      where: { id },
      data: {
        status: (dto.action === "resolve" || dto.action === "resolved") ? "RESOLVED" : "DISMISSED",
        adminNotes: dto.adminNotes,
        resolvedAt: new Date(),
      },
    });

    await this.logAction(adminId, `report_${dto.action}`, "report", id, dto);

    return { message: `Report ${dto.action}d` };
  }

  // ============ ADVANCED ANALYTICS ============

  async getRevenueAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Calculate date ranges for monthly, weekly, daily
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalRevenue, monthlyRevenue, weeklyRevenue, dailyRevenue, platformFees, completedOrders, avgOrderValue] =
      await Promise.all([
        this.prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        this.prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: startOfWeek } },
          _sum: { amount: true },
        }),
        this.prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: startOfDay } },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: {
            type: "PLATFORM_FEE",
            status: "COMPLETED",
            createdAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        this.prisma.order.count({
          where: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
        }),
        this.prisma.order.aggregate({
          where: { status: "COMPLETED", createdAt: { gte: start, lte: end } },
          _avg: { amount: true },
        }),
      ]);

    // Pending withdrawals
    const pendingWithdrawals = await this.prisma.withdrawal.aggregate({
      where: { status: "PENDING" },
      _sum: { amount: true },
      _count: true,
    });

    return {
      period: { start, end },
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: monthlyRevenue._sum.amount || 0,
      weeklyRevenue: weeklyRevenue._sum.amount || 0,
      dailyRevenue: dailyRevenue._sum.amount || 0,
      platformFees: platformFees._sum.amount || 0,
      completedOrders,
      avgOrderValue: Math.round((avgOrderValue._avg.amount || 0) * 100) / 100,
      pendingWithdrawals: {
        count: pendingWithdrawals._count,
        amount: pendingWithdrawals._sum.amount || 0,
      },
    };
  }

  async getUsersGrowth(months = 6) {
    const now = new Date();

    // Calculate this month and last month ranges
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalUsers, thisMonth, lastMonth] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfThisMonth }, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }, deletedAt: null },
      }),
    ]);

    // Also build monthly breakdown for charts
    const monthly = [];
    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(
        now.getFullYear(),
        now.getMonth() - i + 1,
        0,
        23,
        59,
        59,
      );

      const [users, sellers, tenants] = await Promise.all([
        this.prisma.user.count({
          where: { createdAt: { gte: start, lte: end }, deletedAt: null },
        }),
        this.prisma.user.count({
          where: {
            role: "SELLER",
            createdAt: { gte: start, lte: end },
            deletedAt: null,
          },
        }),
        this.prisma.tenant.count({
          where: { createdAt: { gte: start, lte: end }, deletedAt: null },
        }),
      ]);

      monthly.push({
        month: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
        newUsers: users,
        newSellers: sellers,
        newTenants: tenants,
      });
    }

    return {
      totalUsers,
      thisMonth,
      lastMonth,
      monthly,
    };
  }

  async getTopSellers(limit = 10) {
    try {
      const sellers = await this.prisma.user.findMany({
        where: { role: "SELLER", isActive: true, deletedAt: null },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          sellerProfile: {
            select: { level: true, totalEarnings: true, totalOrders: true },
          },
          tenants: {
            where: { deletedAt: null },
            take: 1,
            select: { name: true, subdomain: true },
          },
          _count: {
            select: { sellerOrders: true, reviewsReceived: true },
          },
        },
        orderBy: {
          sellerOrders: { _count: "desc" },
        },
        take: Number(limit) || 10,
      });

      // Map to frontend-expected format
      return sellers.map((s: any) => ({
        id: s.id,
        email: s.email,
        firstName: s.firstName,
        lastName: s.lastName,
        name: s.tenants?.[0]?.name || `${s.firstName} ${s.lastName}`,
        storeName: s.tenants?.[0]?.name,
        subdomain: s.tenants?.[0]?.subdomain,
        totalRevenue: s.sellerProfile?.totalEarnings || 0,
        revenue: s.sellerProfile?.totalEarnings || 0,
        totalOrders: s.sellerProfile?.totalOrders || s._count?.sellerOrders || 0,
        level: s.sellerProfile?.level,
      }));
    } catch (error) {
      console.error('Error in getTopSellers:', error);
      return [];
    }
  }

  async getTopProducts(limit = 10) {
    try {
      const products = await this.prisma.product.findMany({
        where: { isPublished: true, deletedAt: null },
        select: {
          id: true,
          name: true,
          price: true,
          tenant: { select: { id: true, name: true, subdomain: true } },
          _count: { select: { orderItems: true } },
        },
        orderBy: { orderItems: { _count: "desc" } },
        take: Number(limit) || 10,
      });

      // Map to frontend-expected format
      return products.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        totalSold: p._count?.orderItems || 0,
        orderCount: p._count?.orderItems || 0,
        tenant: p.tenant,
      }));
    } catch (error) {
      console.error('Error in getTopProducts:', error);
      return [];
    }
  }

  // ============ CATEGORY MANAGEMENT ============

  async listCategories(type?: string) {
    const where: any = {};
    if (type) where.type = type;

    return this.prisma.category.findMany({
      where,
      include: {
        _count: { select: { products: true, services: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createCategory(dto: AdminCreateCategoryDto, adminId: string) {
    const existing = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug: dto.slug }] },
    });
    if (existing)
      throw new BadRequestException("Category name or slug already exists");

    const category = await this.prisma.category.create({ data: dto as any });
    await this.logAction(
      adminId,
      "create_category",
      "category",
      category.id,
      dto,
    );
    return category;
  }

  async updateCategory(
    id: string,
    dto: AdminUpdateCategoryDto,
    adminId: string,
  ) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException("Category not found");

    const updated = await this.prisma.category.update({
      where: { id },
      data: dto as any,
    });
    await this.logAction(adminId, "update_category", "category", id, dto);
    return updated;
  }

  async deleteCategory(id: string, adminId: string) {
    const cat = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true, services: true } } },
    });
    if (!cat) throw new NotFoundException("Category not found");
    if (cat._count.products > 0 || cat._count.services > 0) {
      throw new BadRequestException(
        `Cannot delete: ${cat._count.products} products and ${cat._count.services} services use this category`,
      );
    }

    await this.prisma.category.delete({ where: { id } });
    await this.logAction(adminId, "delete_category", "category", id, {});
    return { message: "Category deleted" };
  }

  // ============ JOB MODERATION ============

  async listAllJobs(page = 1, limit = 20, status?: string, search?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        include: {
          buyer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tenant: { select: { id: true, subdomain: true, name: true } },
          _count: { select: { proposals: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.job.count({ where }),
    ]);

    return PaginationHelper.formatResponse(jobs, total, page, limit);
  }

  async getJobDetail(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        tenant: { select: { id: true, subdomain: true, name: true } },
        proposals: {
          include: {
            seller: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!job) throw new NotFoundException("Job not found");
    return job;
  }

  async moderateJob(id: string, dto: AdminModerateJobDto, adminId: string) {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException("Job not found");

    await this.prisma.job.update({
      where: { id },
      data: { status: dto.status as any },
    });

    await this.logAction(adminId, `moderate_job_${dto.status}`, "job", id, dto);

    return { message: `Job status updated to ${dto.status}` };
  }

  async deleteJobAdmin(id: string, adminId: string) {
    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.logAction(adminId, "admin_delete_job", "job", id, {});
    return { message: "Job deleted by admin" };
  }

  // ============ PROPOSAL MANAGEMENT ============

  async listAllProposals(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      deletedAt: null,
      ...(status && { status }),
    };

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        include: {
          seller: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          job: {
            select: { id: true, title: true, budget: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return PaginationHelper.formatResponse(proposals, total, page, limit);
  }

  async getProposalDetail(id: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: {
        seller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        job: {
          include: {
            buyer: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!proposal) throw new NotFoundException("Proposal not found");
    return proposal;
  }

  // ============ REVIEW MODERATION ============

  async listAllReviews(
    page = 1,
    limit = 20,
    minRating?: number,
    maxRating?: number,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {};
    if (minRating) where.rating = { ...where.rating, gte: minRating };
    if (maxRating) where.rating = { ...where.rating, lte: maxRating };

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take,
        include: {
          giver: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          receiver: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          order: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
    ]);

    // Map giver to reviewer for frontend compatibility
    const reviewsWithReviewer = reviews.map((r: any) => ({
      ...r,
      reviewer: r.giver,
    }));

    return PaginationHelper.formatResponse(reviewsWithReviewer, total, page, limit);
  }

  async deleteReviewAdmin(id: string, adminId: string, reason?: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Review not found");

    await this.prisma.review.delete({ where: { id } });
    await this.logAction(adminId, "admin_delete_review", "review", id, {
      reason,
    });

    // Recalculate receiver's average rating
    const stats = await this.prisma.review.aggregate({
      where: { receiverId: review.receiverId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.sellerProfile.updateMany({
      where: { userId: review.receiverId },
      data: {
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });

    return { message: "Review deleted" };
  }

  // ============ CHAT MONITORING ============

  async listChatRooms(page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [rooms, total] = await Promise.all([
      this.prisma.chatRoom.findMany({
        skip,
        take,
        include: {
          participants: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          tenant: { select: { id: true, subdomain: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.chatRoom.count(),
    ]);

    return PaginationHelper.formatResponse(rooms, total, page, limit);
  }

  async getChatMessages(roomId: string, page = 1, limit = 50) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException("Chat room not found");

    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId },
        skip,
        take,
        include: {
          sender: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.chatMessage.count({ where: { roomId } }),
    ]);

    return PaginationHelper.formatResponse(messages, total, page, limit);
  }

  // ============ SUBSCRIPTION MANAGEMENT ============

  async listSubscriptions(page = 1, limit = 20, plan?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      deletedAt: null,
      ...(plan && { subscriptionPlan: plan }),
    };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          subdomain: true,
          name: true,
          subscriptionPlan: true,
          sellerTier: true,
          postsLimit: true,
          usedPosts: true,
          subscriptionExpiresAt: true,
          isActive: true,
          owner: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return PaginationHelper.formatResponse(tenants, total, page, limit);
  }

  async updateTenantSubscription(
    tenantId: string,
    dto: AdminUpdateSubscriptionDto,
    adminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    const data: any = {};
    if (dto.subscriptionPlan) data.subscriptionPlan = dto.subscriptionPlan;
    if (dto.expiresAt) data.subscriptionExpiresAt = new Date(dto.expiresAt);
    if (dto.postsLimit !== undefined) data.postsLimit = dto.postsLimit;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.logAction(
      adminId,
      "admin_update_subscription",
      "tenant",
      tenantId,
      dto,
    );

    return updated;
  }

  // ============ TRANSACTION LEDGER ============

  async listTransactions(page = 1, limit = 20, type?: string, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      ...(type && { type }),
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return PaginationHelper.formatResponse(transactions, total, page, limit);
  }

  async getTransactionDetail(id: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!tx) throw new NotFoundException("Transaction not found");
    return tx;
  }

  // ============ CUSTOM OFFER OVERSIGHT ============

  async listCustomOffers(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {};
    if (status === "accepted") where.isAccepted = true;
    else if (status === "declined") where.isDeclined = true;
    else if (status === "pending") {
      where.isAccepted = false;
      where.isDeclined = false;
    }

    const [offers, total] = await Promise.all([
      this.prisma.customOffer.findMany({
        where,
        skip,
        take,
        include: {
          buyer: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
          seller: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.customOffer.count({ where }),
    ]);

    return PaginationHelper.formatResponse(offers, total, page, limit);
  }

  async cancelCustomOffer(id: string, adminId: string) {
    const offer = await this.prisma.customOffer.findUnique({ where: { id } });
    if (!offer) throw new NotFoundException("Custom offer not found");

    await this.prisma.customOffer.update({
      where: { id },
      data: { isDeclined: true },
    });

    await this.logAction(adminId, "admin_cancel_offer", "custom_offer", id, {});
    return { message: "Custom offer cancelled by admin" };
  }

  // ============ SELLER LEVEL MANAGEMENT ============

  async setSellerLevel(
    userId: string,
    dto: AdminSetSellerLevelDto,
    adminId: string,
  ) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException("Seller profile not found");

    await this.prisma.sellerProfile.update({
      where: { userId },
      data: { level: dto.level as any, levelUpdatedAt: new Date() },
    });

    await this.logAction(
      adminId,
      "set_seller_level",
      "seller_profile",
      userId,
      dto,
    );
    return { message: `Seller level set to ${dto.level}` };
  }

  // ============ BOOST MANAGEMENT ============

  async boostListing(dto: AdminBoostListingDto, adminId: string) {
    // 1. Get listing with tenant subscription info
    let listing: any;
    
    if (dto.type === "product") {
      listing = await this.prisma.product.findUnique({
        where: { id: dto.listingId },
        include: { 
          tenant: { 
            select: { 
              id: true, 
              name: true, 
              subdomain: true, 
              subscriptionPlan: true 
            } 
          } 
        },
      });
    } else if (dto.type === "service") {
      listing = await this.prisma.service.findUnique({
        where: { id: dto.listingId },
        include: { 
          tenant: { 
            select: { 
              id: true, 
              name: true, 
              subdomain: true, 
              subscriptionPlan: true 
            } 
          } 
        },
      });
    } else if (dto.type === "job") {
      listing = await this.prisma.job.findUnique({
        where: { id: dto.listingId },
        include: { 
          tenant: { 
            select: { 
              id: true, 
              name: true, 
              subdomain: true, 
              subscriptionPlan: true 
            } 
          } 
        },
      });
    } else {
      throw new BadRequestException("Invalid listing type");
    }

    if (!listing) {
      throw new NotFoundException(`${dto.type} not found`);
    }

    // 2. Check if seller has boost access (Premium/Business only)
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: listing.tenant.subscriptionPlan },
      select: { canBoostListing: true },
    });

    if (!planConfig?.canBoostListing) {
      throw new BadRequestException(
        `Tidak dapat boost listing ini. Seller "${listing.tenant.name}" menggunakan paket ${listing.tenant.subscriptionPlan}. ` +
        `Seller harus upgrade ke Premium atau Business terlebih dahulu untuk bisa di-boost.`
      );
    }

    // 3. Boost listing with custom duration
    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + dto.days);

    if (dto.type === "product") {
      await this.prisma.product.update({
        where: { id: dto.listingId },
        data: { isBoosted: true, boostedUntil },
      });
    } else if (dto.type === "service") {
      await this.prisma.service.update({
        where: { id: dto.listingId },
        data: { isBoosted: true, boostedUntil },
      });
    } else if (dto.type === "job") {
      await this.prisma.job.update({
        where: { id: dto.listingId },
        data: { isBoosted: true, boostedUntil },
      });
    }

    // 4. Log admin action
    await this.logAction(
      adminId,
      "boost_listing",
      dto.type,
      dto.listingId,
      {
        ...dto,
        sellerName: listing.tenant.name,
        sellerPlan: listing.tenant.subscriptionPlan,
      },
    );

    return {
      message: `${dto.type} berhasil di-boost hingga ${boostedUntil.toLocaleDateString('id-ID')}`,
      listing: {
        id: listing.id,
        name: listing.name || listing.title,
        type: dto.type,
      },
      seller: {
        name: listing.tenant.name,
        subdomain: listing.tenant.subdomain,
        plan: listing.tenant.subscriptionPlan,
      },
      boostedUntil,
    };
  }

  async removeBoost(dto: AdminRemoveBoostDto, adminId: string) {
    if (dto.type === "product") {
      await this.prisma.product.update({
        where: { id: dto.listingId },
        data: { isBoosted: false, boostedUntil: null },
      });
    } else if (dto.type === "service") {
      await this.prisma.service.update({
        where: { id: dto.listingId },
        data: { isBoosted: false, boostedUntil: null },
      });
    } else if (dto.type === "job") {
      await this.prisma.job.update({
        where: { id: dto.listingId },
        data: { isBoosted: false, boostedUntil: null },
      });
    }

    await this.logAction(adminId, "remove_boost", dto.type, dto.listingId, {});
    return { message: "Boost removed" };
  }

  async listBoostedListings() {
    const now = new Date();
    const [products, services, jobs] = await Promise.all([
      this.prisma.product.findMany({
        where: { isBoosted: true, boostedUntil: { gte: now }, deletedAt: null },
        select: {
          id: true,
          name: true,
          boostedUntil: true,
          tenant: { select: { id: true, subdomain: true, name: true } },
        },
      }),
      this.prisma.service.findMany({
        where: { isBoosted: true, boostedUntil: { gte: now }, deletedAt: null },
        select: {
          id: true,
          name: true,
          boostedUntil: true,
          tenant: { select: { id: true, subdomain: true, name: true } },
        },
      }),
      this.prisma.job.findMany({
        where: { isBoosted: true, boostedUntil: { gte: now }, deletedAt: null },
        select: {
          id: true,
          title: true,
          boostedUntil: true,
          tenant: { select: { id: true, subdomain: true, name: true } },
        },
      }),
    ]);

    // Flatten into a single array for frontend compatibility
    const allBoosts: Array<{
      id: string;
      listingId: string;
      listingType: string;
      type: string;
      expiresAt: Date | null;
      product?: { name?: string };
      service?: { name?: string };
    }> = [];

    for (const p of products) {
      allBoosts.push({
        id: `product-${p.id}`,
        listingId: p.id,
        listingType: "PRODUCT",
        type: "PRODUCT",
        expiresAt: p.boostedUntil,
        product: { name: p.name },
      });
    }
    for (const s of services) {
      allBoosts.push({
        id: `service-${s.id}`,
        listingId: s.id,
        listingType: "SERVICE",
        type: "SERVICE",
        expiresAt: s.boostedUntil,
        service: { name: s.name },
      });
    }
    for (const j of jobs) {
      allBoosts.push({
        id: `job-${j.id}`,
        listingId: j.id,
        listingType: "JOB",
        type: "JOB",
        expiresAt: j.boostedUntil,
        product: { name: (j as any).title },
      });
    }

    return allBoosts;
  }

  /**
   * List Premium/Business sellers with their boostable listings
   * For admin boost UI - only show sellers who can be boosted
   */
  async listPremiumSellersForBoost(page = 1, limit = 20, search?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    
    // Get all plans that have boost access
    const plansWithBoost = await this.prisma.subscriptionPlanConfig.findMany({
      where: { canBoostListing: true },
      select: { plan: true },
    });
    
    const boostablePlans = plansWithBoost.map(p => p.plan);
    
    if (boostablePlans.length === 0) {
      // No plans have boost access, return empty
      return PaginationHelper.formatResponse([], 0, page, limit);
    }
    
    // Get sellers with boost access
    const where: any = {
      subscriptionPlan: { in: boostablePlans },
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { subdomain: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [sellers, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          name: true,
          subdomain: true,
          subscriptionPlan: true,
          owner: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          // Get boostable listings
          products: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              thumbnail: true,
              price: true,
              isBoosted: true,
              boostedUntil: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          services: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              thumbnail: true,
              basePrice: true,
              isBoosted: true,
              boostedUntil: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          jobs: {
            where: { deletedAt: null },
            select: {
              id: true,
              title: true,
              budget: true,
              isBoosted: true,
              boostedUntil: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return PaginationHelper.formatResponse(sellers, total, page, limit);
  }

  // ============ PROMOTION / COUPON MANAGEMENT ============

  async listPromotions(page = 1, limit = 20, isActive?: boolean) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      ...(typeof isActive === "boolean" && { isActive }),
    };

    const [promotions, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    // Map to frontend-expected format
    const promotionsWithMapping = promotions.map((p: any) => ({
      ...p,
      discountPercent: p.type === "PERCENTAGE" ? p.value : undefined,
      discountAmount: p.type === "FIXED_AMOUNT" ? p.value : undefined,
      maxUses: p.usageLimit,
      expiresAt: p.endDate,
    }));

    return PaginationHelper.formatResponse(promotionsWithMapping, total, page, limit);
  }

  async createPromotion(dto: AdminCreatePromotionDto, adminId: string) {
    const existing = await this.prisma.promotion.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new BadRequestException("Promotion code already exists");

    const promo = await this.prisma.promotion.create({
      data: {
        code: dto.code.toUpperCase(),
        name: dto.name,
        description: dto.description,
        type: (dto.type as any) || "PERCENTAGE",
        value: dto.value,
        minOrderAmount: dto.minOrderAmount,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        perUserLimit: dto.perUserLimit || 1,
        tenantId: dto.tenantId,
        applicableTo: dto.applicableTo || "all",
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        createdBy: adminId,
      },
    });

    await this.logAction(
      adminId,
      "create_promotion",
      "promotion",
      promo.id,
      dto,
    );
    return promo;
  }

  async updatePromotion(
    id: string,
    dto: AdminUpdatePromotionDto,
    adminId: string,
  ) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) throw new NotFoundException("Promotion not found");

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.promotion.update({ where: { id }, data });
    await this.logAction(adminId, "update_promotion", "promotion", id, dto);
    return updated;
  }

  async deletePromotion(id: string, adminId: string) {
    await this.prisma.promotion.delete({ where: { id } });
    await this.logAction(adminId, "delete_promotion", "promotion", id, {});
    return { message: "Promotion deleted" };
  }

  // ============ NOTIFICATION MANAGEMENT ============

  async listAllNotifications(page = 1, limit = 50, type?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = { ...(type && { type }) };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        include: {
          user: { select: { id: true, email: true, firstName: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return PaginationHelper.formatResponse(notifications, total, page, limit);
  }

  async deleteNotification(id: string) {
    await this.prisma.notification.delete({ where: { id } });
    return { message: "Notification deleted" };
  }

  async cleanupOldNotifications(daysOld = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff }, isRead: true },
    });

    return { message: `Deleted ${result.count} old notifications` };
  }

  // ============ BULK USER ACTIONS ============

  async bulkUserAction(dto: AdminBulkUserActionDto, adminId: string) {
    const results = { success: 0, failed: 0 };

    for (const userId of dto.userIds) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        if (!user || user.role === "SUPER_ADMIN") {
          results.failed++;
          continue;
        }

        switch (dto.action) {
          case "ban":
            await this.prisma.user.update({
              where: { id: userId },
              data: { isActive: false },
            });
            break;
          case "unban":
          case "activate":
            await this.prisma.user.update({
              where: { id: userId },
              data: { isActive: true },
            });
            break;
          case "deactivate":
            await this.prisma.user.update({
              where: { id: userId },
              data: { isActive: false },
            });
            break;
          case "delete":
            await this.prisma.user.update({
              where: { id: userId },
              data: { deletedAt: new Date(), isActive: false },
            });
            break;
          default:
            results.failed++;
            continue;
        }
        results.success++;
      } catch {
        results.failed++;
      }
    }

    await this.logAction(adminId, `bulk_${dto.action}`, "user", "bulk", {
      userIds: dto.userIds,
      results,
    });

    return {
      message: `Bulk ${dto.action}: ${results.success} success, ${results.failed} failed`,
      ...results,
    };
  }

  // ============ ACTIVITY LOGS ============

  async listActivityLogs(
    page = 1,
    limit = 50,
    action?: string,
    userId?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = {
      ...(action && { action }),
      ...(userId && { userId }),
    };

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return PaginationHelper.formatResponse(logs, total, page, limit);
  }

  // ============ SYSTEM DASHBOARD ============

  async getSystemDashboard() {
    const [
      totalUsers,
      totalTenants,
      totalOrders,
      totalRevenue,
      pendingKyc,
      pendingWithdrawals,
      openDisputes,
      pendingReports,
      activeBoosted,
      activePromotions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.order.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
      }),
      this.prisma.kycSubmission.count({ where: { status: "PENDING" } }),
      this.prisma.withdrawal.count({ where: { status: "PENDING" } }),
      this.prisma.dispute.count({ where: { status: "OPEN" } }),
      this.prisma.report.count({ where: { status: "PENDING" } }),
      this.prisma.product.count({
        where: { isBoosted: true, boostedUntil: { gte: new Date() } },
      }),
      this.prisma.promotion.count({
        where: { isActive: true, endDate: { gte: new Date() } },
      }),
    ]);

    return {
      overview: {
        totalUsers,
        totalTenants,
        totalOrders,
        totalRevenue: totalRevenue._sum.amount || 0,
      },
      pendingActions: {
        pendingKyc,
        pendingWithdrawals,
        openDisputes,
        pendingReports,
      },
      marketing: { activeBoosted, activePromotions },
    };
  }

  // ============ ORDER DETAIL ============

  async getOrderDetail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        buyer: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        seller: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        tenant: { select: { id: true, subdomain: true, name: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
        deliveries: true,
        milestones: true,
        activities: true,
        cancellation: true,
        extension: true,
      },
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  // ============ DATABASE BACKUP ============

  async getDatabaseStats() {
    try {
      return await this.backupService.getDatabaseStats();
    } catch (error) {
      console.error('[Admin] Error getting database stats:', error);
      throw new BadRequestException('Failed to get database stats');
    }
  }

  async createDatabaseBackup(adminId: string): Promise<any> {
    try {
      console.log(`[Admin] Creating database backup by admin: ${adminId}`);

      const backup = await this.backupService.createBackup(adminId, 'manual');
      
      return {
        success: true,
        message: 'Database backup created successfully',
        data: backup,
      };
    } catch (error) {
      console.error('[Admin] Error creating database backup:', error);
      throw error;
    }
  }

  async listDatabaseBackups(): Promise<any> {
    try {
      const backups = await this.backupService.listBackups();
      
      return {
        success: true,
        data: backups,
      };
    } catch (error) {
      console.error('[Admin] Error listing database backups:', error);
      throw new BadRequestException('Failed to list database backups');
    }
  }

  async getBackupFilePath(filename: string): Promise<string> {
    try {
      return await this.backupService.getBackupPath(filename);
    } catch (error) {
      console.error('[Admin] Error getting backup file path:', error);
      throw new NotFoundException('Backup file not found');
    }
  }

  async deleteDatabaseBackup(filename: string, adminId: string) {
    try {
      console.log(`[Admin] Deleting database backup: ${filename} by admin: ${adminId}`);
      
      await this.backupService.deleteBackup(filename, adminId);
      
      return {
        success: true,
        message: 'Database backup deleted successfully',
      };
    } catch (error) {
      console.error('[Admin] Error deleting database backup:', error);
      throw error;
    }
  }

  async restoreDatabaseBackup(filename: string, adminId: string) {
    try {
      console.log(`[Admin] Restoring database from backup: ${filename} by admin: ${adminId}`);
      
      await this.backupService.restoreBackup(filename, adminId);
      
      return {
        success: true,
        message: 'Database restored successfully',
      };
    } catch (error) {
      console.error('[Admin] Error restoring database backup:', error);
      throw error;
    }
  }

  async getBackupConfig() {
    return this.backupService.getBackupConfig();
  }

  async testGoogleDriveConnection() {
    return this.backupService.testGoogleDrive();
  }

  // ============ DATA EXPORT FOR CRM ============

  async exportUsersData(format: 'csv' | 'excel' = 'csv') {
    try {
      console.log(`[Admin] Exporting users data in ${format} format`);

      // Fetch all users with related data
      const users = await this.prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          tenants: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              subdomain: true,
              subscriptionPlan: true,
              sellerTier: true,
              city: true,
              isVerified: true,
              isFeatured: true,
              createdAt: true,
            },
          },
          kycSubmission: {
            select: {
              status: true,
              verifiedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform data for export
      const exportData = users.map((user) => {
        const tenant = user.tenants[0]; // Get first tenant
        return {
          'User ID': user.id,
          'Email': user.email,
          'First Name': user.firstName,
          'Last Name': user.lastName,
          'Phone': user.phone || '',
          'Role': user.role,
          'Status': user.isActive ? 'Active' : 'Inactive',
          'Email Verified': user.isEmailVerified ? 'Yes' : 'No',
          'KYC Status': user.kycSubmission?.status || 'Not Submitted',
          'KYC Verified Date': user.kycSubmission?.verifiedAt 
            ? new Date(user.kycSubmission.verifiedAt).toLocaleDateString('id-ID')
            : '',
          'Store Name': tenant?.name || '',
          'Store Subdomain': tenant?.subdomain || '',
          'Subscription Plan': tenant?.subscriptionPlan || '',
          'Seller Tier': tenant?.sellerTier || '',
          'Store City': tenant?.city || '',
          'Store Verified': tenant?.isVerified ? 'Yes' : 'No',
          'Store Featured': tenant?.isFeatured ? 'Yes' : 'No',
          'Store Created': tenant?.createdAt 
            ? new Date(tenant.createdAt).toLocaleDateString('id-ID')
            : '',
          'User Created': new Date(user.createdAt).toLocaleDateString('id-ID'),
        };
      });

      if (format === 'csv') {
        return this.generateCSV(exportData);
      } else {
        return this.generateExcel(exportData);
      }
    } catch (error) {
      console.error('[Admin] Error exporting users data:', error);
      throw new BadRequestException('Failed to export users data');
    }
  }

  private generateCSV(data: any[]): Buffer {
    try {
      const parser = new Parser();
      const csv = parser.parse(data);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      console.error('[Admin] Error generating CSV:', error);
      throw new BadRequestException('Failed to generate CSV file');
    }
  }

  private async generateExcel(data: any[]): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Users Data');

      // Add headers
      if (data.length > 0) {
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };

        // Add data rows
        data.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });

        // Auto-fit columns
        worksheet.columns?.forEach((column: any) => {
          if (column && column.eachCell) {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell: any) => {
              const columnLength = cell.value ? cell.value.toString().length : 10;
              if (columnLength > maxLength) {
                maxLength = columnLength;
              }
            });
            column.width = Math.min(maxLength + 2, 50);
          }
        });
      }

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error('[Admin] Error generating Excel:', error);
      throw new BadRequestException('Failed to generate Excel file');
    }
  }
}
