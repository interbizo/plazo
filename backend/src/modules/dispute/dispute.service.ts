import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';
import { EscrowService } from '@modules/orders/escrow.service';
import { NotificationEventsService } from '@modules/notifications/notification-events.service';
import { DisputeStatus } from '@prisma/client';

interface OpenDisputeDto {
  orderId: string;
  reason: string;
  evidence?: string[]; // Array of file URLs
}

interface ResolveDisputeDto {
  decision: 'BUYER_WIN' | 'SELLER_WIN' | 'PARTIAL';
  resolution: string;
  refundAmount?: number; // Required for PARTIAL and BUYER_WIN
  adminNotes?: string;
}

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private prisma: PrismaService,
    private escrowService: EscrowService,
    private notifEvents: NotificationEventsService,
  ) {}

  /**
   * Open a dispute (buyer or seller can open)
   */
  async openDispute(userId: string, dto: OpenDisputeDto) {
    try {
      // Verify order exists and user is a party
      const order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: {
          buyer: { select: { id: true, firstName: true, lastName: true } },
          seller: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check if user is buyer or seller
      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new ForbiddenException('You are not a party to this order');
      }

      // Check if order can be disputed
      if (order.status === 'PENDING_PAYMENT' || order.status === 'PAYMENT_UPLOADED') {
        throw new BadRequestException('Cannot dispute order before payment verified');
      }

      if (order.status === 'COMPLETED') {
        throw new BadRequestException('Cannot dispute completed order');
      }

      if (order.status === 'CANCELLED') {
        throw new BadRequestException('Cannot dispute cancelled order');
      }

      // Check if dispute already exists
      const existingDispute = await this.prisma.dispute.findUnique({
        where: { orderId: dto.orderId },
      });

      if (existingDispute) {
        throw new BadRequestException('Dispute already exists for this order');
      }

      // Create dispute
      const dispute = await this.prisma.$transaction(async (tx) => {
        // Create dispute record
        const newDispute = await tx.dispute.create({
          data: {
            orderId: dto.orderId,
            openedById: userId,
            reason: dto.reason,
            evidence: dto.evidence || [],
            status: DisputeStatus.OPEN,
          },
          include: {
            openedBy: {
              select: { id: true, firstName: true, lastName: true },
            },
            order: {
              select: {
                id: true,
                title: true,
                amount: true,
                status: true,
              },
            },
          },
        });

        // Update order status to DISPUTED
        await tx.order.update({
          where: { id: dto.orderId },
          data: { status: 'DISPUTED' },
        });

        // Log activity
        await tx.orderActivity.create({
          data: {
            orderId: dto.orderId,
            action: 'dispute_opened',
            description: `Dispute opened by ${newDispute.openedBy.firstName} ${newDispute.openedBy.lastName}`,
            actorId: userId,
            metadata: {
              reason: dto.reason,
              evidenceCount: dto.evidence?.length || 0,
            },
          },
        });

        return newDispute;
      });

      this.logger.log(`Dispute opened for order ${dto.orderId} by user ${userId}`);

      const openedByName =
        `${dispute.openedBy.firstName} ${dispute.openedBy.lastName}`.trim() ||
        'Pengguna';
      const otherPartyId =
        order.buyerId === userId ? order.sellerId : order.buyerId;

      await this.notifEvents.onDisputeOpened({
        tenantId: order.tenantId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        otherPartyId,
        orderTitle: order.title,
        disputeId: dispute.id,
        openedByName,
      });

      return {
        message: 'Dispute opened successfully',
        dispute,
      };
    } catch (error) {
      this.logger.error('Failed to open dispute', error);
      throw error;
    }
  }

  /**
   * Get dispute details
   */
  async getDispute(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        openedBy: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        order: {
          include: {
            buyer: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
            seller: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check authorization (buyer, seller, or admin)
    const isParty =
      dispute.order.buyerId === userId || dispute.order.sellerId === userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    if (!isParty && !isAdmin) {
      throw new ForbiddenException('Not authorized to view this dispute');
    }

    return dispute;
  }

  /**
   * Admin: Resolve dispute
   */
  async resolveDispute(
    disputeId: string,
    adminId: string,
    dto: ResolveDisputeDto,
  ) {
    try {
      // Verify admin role
      const admin = await this.prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true, firstName: true, lastName: true },
      });

      if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
        throw new ForbiddenException('Only admins can resolve disputes');
      }

      // Get dispute
      const dispute = await this.prisma.dispute.findUnique({
        where: { id: disputeId },
        include: {
          order: {
            include: {
              buyer: { select: { id: true, firstName: true, lastName: true } },
              seller: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      if (!dispute) {
        throw new NotFoundException('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.IN_REVIEW) {
        throw new BadRequestException('Dispute already resolved');
      }

      // Validate refund amount for BUYER_WIN and PARTIAL
      if (dto.decision === 'BUYER_WIN' || dto.decision === 'PARTIAL') {
        if (!dto.refundAmount || dto.refundAmount <= 0) {
          throw new BadRequestException('Refund amount required for this decision');
        }

        if (dto.refundAmount > dispute.order.amount) {
          throw new BadRequestException('Refund amount cannot exceed order amount');
        }
      }

      // Determine new status based on decision
      let newStatus: DisputeStatus;
      switch (dto.decision) {
        case 'BUYER_WIN':
          newStatus = DisputeStatus.RESOLVED_BUYER_WIN;
          break;
        case 'SELLER_WIN':
          newStatus = DisputeStatus.RESOLVED_SELLER_WIN;
          break;
        case 'PARTIAL':
          newStatus = DisputeStatus.RESOLVED_PARTIAL;
          break;
      }

      // Execute resolution
      await this.prisma.$transaction(async (tx) => {
        // Update dispute
        await tx.dispute.update({
          where: { id: disputeId },
          data: {
            status: newStatus,
            decision: dto.decision,
            resolution: dto.resolution,
            refundAmount: dto.refundAmount,
            adminId: adminId,
            adminNotes: dto.adminNotes,
            resolvedAt: new Date(),
          },
        });

        // Update order status
        await tx.order.update({
          where: { id: dispute.orderId },
          data: { status: 'COMPLETED' }, // Mark as completed after resolution
        });

        // Handle escrow based on decision
        if (dto.decision === 'BUYER_WIN') {
          // Full refund to buyer
          await this.escrowService.refundEscrow(
            dispute.orderId,
            `Dispute resolved in favor of buyer: ${dto.resolution}`,
            dto.refundAmount,
          );
        } else if (dto.decision === 'SELLER_WIN') {
          // Full release to seller
          await this.escrowService.releaseEscrow(
            dispute.orderId,
            `Dispute resolved in favor of seller: ${dto.resolution}`,
          );
        } else if (dto.decision === 'PARTIAL') {
          // Partial refund to buyer, rest to seller
          await this.escrowService.refundEscrow(
            dispute.orderId,
            `Dispute resolved with partial refund: ${dto.resolution}`,
            dto.refundAmount,
          );
        }

        // Log activity
        await tx.orderActivity.create({
          data: {
            orderId: dispute.orderId,
            action: 'dispute_resolved',
            description: `Dispute resolved by admin: ${dto.decision}`,
            actorId: adminId,
            metadata: {
              decision: dto.decision,
              refundAmount: dto.refundAmount,
              resolution: dto.resolution,
            },
          },
        });
      });

      this.logger.log(
        `Dispute ${disputeId} resolved by admin ${adminId}: ${dto.decision}`,
      );

      await this.notifEvents.onDisputeResolved({
        tenantId: dispute.order.tenantId,
        buyerId: dispute.order.buyerId,
        sellerId: dispute.order.sellerId,
        orderTitle: dispute.order.title,
        resolution: dto.resolution,
        disputeId,
      });

      return {
        message: 'Dispute resolved successfully',
        decision: dto.decision,
        refundAmount: dto.refundAmount,
      };
    } catch (error) {
      this.logger.error('Failed to resolve dispute', error);
      throw error;
    }
  }

  /**
   * Admin: Update dispute status to IN_REVIEW
   */
  async markAsInReview(disputeId: string, adminId: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only admins can update dispute status');
    }

    const dispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: DisputeStatus.IN_REVIEW },
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: dispute.orderId,
        action: 'dispute_in_review',
        description: 'Dispute is now under admin review',
        actorId: adminId,
      },
    });

    const disputeDetail = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        order: {
          select: {
            tenantId: true,
            buyerId: true,
            sellerId: true,
            title: true,
          },
        },
      },
    });

    if (disputeDetail) {
      await this.notifEvents.onDisputeUnderReview({
        tenantId: disputeDetail.order.tenantId,
        buyerId: disputeDetail.order.buyerId,
        sellerId: disputeDetail.order.sellerId,
        orderTitle: disputeDetail.order.title,
        disputeId,
      });
    }

    return { message: 'Dispute marked as in review' };
  }

  /**
   * Add evidence to dispute
   */
  async addEvidence(disputeId: string, userId: string, evidenceUrls: string[]) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { order: true },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    // Check if user is a party to the dispute
    if (
      dispute.order.buyerId !== userId &&
      dispute.order.sellerId !== userId
    ) {
      throw new ForbiddenException('Not authorized');
    }

    // Can only add evidence if dispute is OPEN or IN_REVIEW
    if (
      dispute.status !== DisputeStatus.OPEN &&
      dispute.status !== DisputeStatus.IN_REVIEW
    ) {
      throw new BadRequestException('Cannot add evidence to resolved dispute');
    }

    const updatedDispute = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        evidence: {
          push: evidenceUrls,
        },
      },
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: dispute.orderId,
        action: 'dispute_evidence_added',
        description: `${evidenceUrls.length} evidence file(s) added`,
        actorId: userId,
      },
    });

    return {
      message: 'Evidence added successfully',
      evidenceCount: updatedDispute.evidence.length,
    };
  }

  /**
   * Get all disputes (admin only)
   */
  async getAllDisputes(
    adminId: string,
    page: number = 1,
    limit: number = 20,
    status?: DisputeStatus,
  ) {
    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });

    if (!admin || (admin.role !== 'ADMIN' && admin.role !== 'SUPER_ADMIN')) {
      throw new ForbiddenException('Only admins can view all disputes');
    }

    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where,
        skip,
        take: limit,
        include: {
          openedBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
              buyer: {
                select: { id: true, firstName: true, lastName: true },
              },
              seller: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.dispute.count({ where }),
    ]);

    return {
      data: disputes,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get user's disputes (buyer or seller)
   */
  async getUserDisputes(userId: string) {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { openedById: userId },
          { order: { buyerId: userId } },
          { order: { sellerId: userId } },
        ],
      },
      include: {
        openedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        order: {
          select: {
            id: true,
            title: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return disputes;
  }
}
