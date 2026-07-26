import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@modules/database/prisma.service';

interface StockReservation {
  productId?: string;
  variantId?: string;
  quantity: number;
  userId: string;
  expiresAt: Date;
}

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);
  private readonly RESERVATION_TIMEOUT_MINUTES = 15; // 15 minutes to complete checkout

  constructor(private prisma: PrismaService) {}

  /**
   * Reserve stock for checkout (with database-level locking)
   */
  async reserveStock(
    productId: string,
    variantId: string | null,
    quantity: number,
    userId: string,
  ): Promise<{ reservationId: string; expiresAt: Date }> {
    try {
      // Use transaction with row-level locking to prevent race condition
      const result = await this.prisma.$transaction(async (tx) => {
        let currentStock: number;
        let itemName: string;

        if (variantId) {
          // Lock variant row for update
          const variant = await tx.productVariant.findUnique({
            where: { id: variantId },
            include: { product: { select: { name: true } } },
          });

          if (!variant) {
            throw new BadRequestException('Product variant not found');
          }

          currentStock = variant.stock;
          itemName = `${variant.product.name} - ${variant.name}`;

          // Check if enough stock available
          if (currentStock < quantity) {
            throw new BadRequestException(
              `Insufficient stock. Only ${currentStock} available`,
            );
          }

          // Decrement stock
          await tx.productVariant.update({
            where: { id: variantId },
            data: { stock: { decrement: quantity } },
          });
        } else {
          // Lock product row for update
          const product = await tx.product.findUnique({
            where: { id: productId },
          });

          if (!product) {
            throw new BadRequestException('Product not found');
          }

          currentStock = product.stock;
          itemName = product.name;

          // Check if enough stock available
          if (currentStock < quantity) {
            throw new BadRequestException(
              `Insufficient stock. Only ${currentStock} available`,
            );
          }

          // Decrement stock
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } },
          });
        }

        // Create reservation record
        const expiresAt = new Date();
        expiresAt.setMinutes(
          expiresAt.getMinutes() + this.RESERVATION_TIMEOUT_MINUTES,
        );

        const reservation = await tx.stockReservation.create({
          data: {
            productId,
            variantId,
            quantity,
            userId,
            status: 'RESERVED',
            expiresAt,
          },
        });

        this.logger.log(
          `Stock reserved: ${quantity}x ${itemName} for user ${userId}`,
        );

        return { reservationId: reservation.id, expiresAt };
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to reserve stock', error);
      throw error;
    }
  }

  /**
   * Confirm reservation when order is created
   */
  async confirmReservation(reservationId: string, orderId: string) {
    try {
      const reservation = await this.prisma.stockReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new BadRequestException('Reservation not found');
      }

      if (reservation.status !== 'RESERVED') {
        throw new BadRequestException('Reservation already processed');
      }

      if (new Date() > reservation.expiresAt) {
        throw new BadRequestException('Reservation expired');
      }

      await this.prisma.stockReservation.update({
        where: { id: reservationId },
        data: {
          status: 'CONFIRMED',
          orderId,
          confirmedAt: new Date(),
        },
      });

      this.logger.log(`Stock reservation confirmed: ${reservationId}`);
    } catch (error) {
      this.logger.error('Failed to confirm reservation', error);
      throw error;
    }
  }

  /**
   * Cancel reservation and restore stock
   */
  async cancelReservation(reservationId: string, reason: string = 'Cancelled') {
    try {
      const reservation = await this.prisma.stockReservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        throw new BadRequestException('Reservation not found');
      }

      if (reservation.status !== 'RESERVED') {
        throw new BadRequestException('Reservation already processed');
      }

      await this.prisma.$transaction(async (tx) => {
        // Restore stock
        if (reservation.variantId) {
          await tx.productVariant.update({
            where: { id: reservation.variantId },
            data: { stock: { increment: reservation.quantity } },
          });
        } else if (reservation.productId) {
          await tx.product.update({
            where: { id: reservation.productId },
            data: { stock: { increment: reservation.quantity } },
          });
        }

        // Update reservation status
        await tx.stockReservation.update({
          where: { id: reservationId },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: reason,
          },
        });
      });

      this.logger.log(`Stock reservation cancelled: ${reservationId}`);
    } catch (error) {
      this.logger.error('Failed to cancel reservation', error);
      throw error;
    }
  }

  /**
   * Expire old reservations (called by cron job)
   */
  async expireReservations() {
    try {
      const expiredReservations = await this.prisma.stockReservation.findMany({
        where: {
          status: 'RESERVED',
          expiresAt: { lt: new Date() },
        },
      });

      for (const reservation of expiredReservations) {
        await this.cancelReservation(reservation.id, 'Expired');
      }

      if (expiredReservations.length > 0) {
        this.logger.log(
          `Expired ${expiredReservations.length} stock reservations`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to expire reservations', error);
    }
  }

  /**
   * Restore stock when order is cancelled
   */
  async restoreStockFromOrder(orderId: string) {
    try {
      const orderItems = await this.prisma.orderItem.findMany({
        where: { orderId },
      });

      await this.prisma.$transaction(async (tx) => {
        for (const item of orderItems) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { increment: item.quantity } },
            });
          } else if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      });

      this.logger.log(`Stock restored for cancelled order: ${orderId}`);
    } catch (error) {
      this.logger.error('Failed to restore stock', error);
      throw error;
    }
  }

  /**
   * Check if product has enough stock
   */
  async checkStockAvailability(
    productId: string,
    variantId: string | null,
    quantity: number,
  ): Promise<{ available: boolean; currentStock: number }> {
    let currentStock: number;

    if (variantId) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { stock: true },
      });
      currentStock = variant?.stock || 0;
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });
      currentStock = product?.stock || 0;
    }

    return {
      available: currentStock >= quantity,
      currentStock,
    };
  }
}
