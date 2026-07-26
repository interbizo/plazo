import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly PLATFORM_FEE_RATE = 0.10; // 10% platform fee

  constructor(private prisma: PrismaService) {}

  /**
   * Hold amount in escrow when order is created
   */
  async holdEscrow(orderId: string, amount: number) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (order.escrowAmount) {
        throw new BadRequestException('Escrow already held for this order');
      }

      // Update order with escrow info
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          escrowAmount: amount,
          escrowHeldAt: new Date(),
        },
      });

      // Create escrow transaction record
      await this.prisma.transaction.create({
        data: {
          userId: order.buyerId,
          type: 'ESCROW_HOLD',
          amount: amount,
          fee: 0,
          netAmount: amount,
          status: 'COMPLETED',
          orderId: orderId,
          description: `Escrow hold for order: ${order.title}`,
        },
      });

      this.logger.log(`Escrow held: ${amount} for order ${orderId}`);
      return { success: true, amount };
    } catch (error) {
      this.logger.error(`Failed to hold escrow for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Release escrow to seller when order is completed
   */
  async releaseEscrow(orderId: string, reason: string = 'Order completed') {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          seller: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (!order.escrowAmount) {
        throw new BadRequestException('No escrow to release');
      }

      if (order.escrowReleasedAt) {
        throw new BadRequestException('Escrow already released');
      }

      // Calculate amounts
      const escrowAmount = order.escrowAmount;
      const platformFee = escrowAmount * this.PLATFORM_FEE_RATE;
      const sellerAmount = escrowAmount - platformFee;

      // Use transaction to ensure atomicity
      await this.prisma.$transaction(async (tx) => {
        // 1. Update order escrow status
        await tx.order.update({
          where: { id: orderId },
          data: {
            escrowReleasedAt: new Date(),
          },
        });

        // 2. Create platform fee transaction
        await tx.transaction.create({
          data: {
            userId: order.sellerId,
            type: 'PLATFORM_FEE',
            amount: escrowAmount,
            fee: platformFee,
            netAmount: sellerAmount,
            status: 'COMPLETED',
            orderId: orderId,
            description: `Platform fee (${this.PLATFORM_FEE_RATE * 100}%) for order: ${order.title}`,
          },
        });

        // 3. Create escrow release transaction for seller
        await tx.transaction.create({
          data: {
            userId: order.sellerId,
            type: 'ESCROW_RELEASE',
            amount: escrowAmount,
            fee: platformFee,
            netAmount: sellerAmount,
            status: 'COMPLETED',
            orderId: orderId,
            description: `Escrow release: ${reason}`,
          },
        });

        // 4. Update seller profile earnings
        await tx.sellerProfile.update({
          where: { userId: order.sellerId },
          data: {
            totalEarnings: { increment: sellerAmount },
            totalOrders: { increment: 1 },
          },
        });

        // 5. Log activity
        await tx.orderActivity.create({
          data: {
            orderId: orderId,
            action: 'escrow_released',
            description: `Escrow released: ${sellerAmount.toFixed(2)} (after ${platformFee.toFixed(2)} platform fee)`,
            metadata: {
              escrowAmount,
              platformFee,
              sellerAmount,
              reason,
            },
          },
        });
      });

      this.logger.log(
        `Escrow released: ${sellerAmount} to seller ${order.sellerId} for order ${orderId}`,
      );

      return {
        success: true,
        escrowAmount,
        platformFee,
        sellerAmount,
      };
    } catch (error) {
      this.logger.error(`Failed to release escrow for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Refund escrow to buyer when order is cancelled or disputed
   */
  async refundEscrow(
    orderId: string,
    reason: string = 'Order cancelled',
    partialAmount?: number,
  ) {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      if (!order) {
        throw new BadRequestException('Order not found');
      }

      if (!order.escrowAmount) {
        throw new BadRequestException('No escrow to refund');
      }

      if (order.escrowReleasedAt) {
        throw new BadRequestException('Escrow already released to seller');
      }

      // Determine refund amount
      const refundAmount = partialAmount || order.escrowAmount;

      if (refundAmount > order.escrowAmount) {
        throw new BadRequestException('Refund amount exceeds escrow amount');
      }

      // Use transaction to ensure atomicity
      await this.prisma.$transaction(async (tx) => {
        // 1. Update order escrow status
        await tx.order.update({
          where: { id: orderId },
          data: {
            escrowReleasedAt: new Date(), // Mark as released (refunded)
          },
        });

        // 2. Create refund transaction
        await tx.transaction.create({
          data: {
            userId: order.buyerId,
            type: 'REFUND',
            amount: refundAmount,
            fee: 0,
            netAmount: refundAmount,
            status: 'COMPLETED',
            orderId: orderId,
            description: `Escrow refund: ${reason}`,
          },
        });

        // 3. If partial refund, release remaining to seller
        if (partialAmount && order.escrowAmount && partialAmount < order.escrowAmount) {
          const remainingAmount = order.escrowAmount - partialAmount;
          const platformFee = remainingAmount * this.PLATFORM_FEE_RATE;
          const sellerAmount = remainingAmount - platformFee;

          await tx.transaction.create({
            data: {
              userId: order.sellerId,
              type: 'ESCROW_RELEASE',
              amount: remainingAmount,
              fee: platformFee,
              netAmount: sellerAmount,
              status: 'COMPLETED',
              orderId: orderId,
              description: `Partial escrow release after refund`,
            },
          });

          await tx.sellerProfile.update({
            where: { userId: order.sellerId },
            data: {
              totalEarnings: { increment: sellerAmount },
            },
          });
        }

        // 4. Log activity
        await tx.orderActivity.create({
          data: {
            orderId: orderId,
            action: 'escrow_refunded',
            description: `Escrow refunded: ${refundAmount.toFixed(2)} to buyer`,
            metadata: {
              refundAmount,
              reason,
              isPartial: !!partialAmount,
            },
          },
        });
      });

      this.logger.log(
        `Escrow refunded: ${refundAmount} to buyer ${order.buyerId} for order ${orderId}`,
      );

      return {
        success: true,
        refundAmount,
      };
    } catch (error) {
      this.logger.error(`Failed to refund escrow for order ${orderId}`, error);
      throw error;
    }
  }

  /**
   * Get escrow status for an order
   */
  async getEscrowStatus(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        escrowAmount: true,
        escrowHeldAt: true,
        escrowReleasedAt: true,
      },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const isHeld = !!order.escrowAmount && !!order.escrowHeldAt;
    const isReleased = !!order.escrowReleasedAt;

    let status: 'NOT_HELD' | 'HELD' | 'RELEASED' | 'REFUNDED';
    if (!isHeld) {
      status = 'NOT_HELD';
    } else if (isReleased) {
      // Check if it was released to seller or refunded to buyer
      const releaseTransaction = await this.prisma.transaction.findFirst({
        where: {
          orderId: orderId,
          type: 'ESCROW_RELEASE',
        },
      });
      status = releaseTransaction ? 'RELEASED' : 'REFUNDED';
    } else {
      status = 'HELD';
    }

    return {
      orderId: order.id,
      orderStatus: order.status,
      escrowAmount: order.escrowAmount,
      escrowStatus: status,
      heldAt: order.escrowHeldAt,
      releasedAt: order.escrowReleasedAt,
    };
  }

  /**
   * Auto-release escrow after delivery accepted (called by order service)
   */
  async autoReleaseOnCompletion(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Only auto-release if order is completed and escrow not yet released
    if (order.status === OrderStatus.COMPLETED && !order.escrowReleasedAt) {
      await this.releaseEscrow(orderId, 'Order completed - auto release');
    }
  }

  /**
   * Auto-refund escrow on cancellation (called by order service)
   */
  async autoRefundOnCancellation(orderId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    // Only auto-refund if escrow held and not yet released
    if (order.escrowAmount && !order.escrowReleasedAt) {
      await this.refundEscrow(orderId, reason);
    }
  }
}
