import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  AddToCartDto,
  UpdateCartItemDto,
  CheckoutDto,
  DirectPurchaseDto,
  ShippingInfoDto,
} from "./cart.dto";
import { OrderStatus } from "@prisma/client";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";
import * as crypto from "crypto";

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private notifEvents: NotificationEventsService,
  ) {}

  private generatePaymentCode(): string {
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `PAY-${date}-${random}`;
  }

  async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                tenant: { select: { id: true, name: true, subdomain: true } },
              },
            },
            variant: {
              include: {
                options: true,
              },
            },
          },
          where: {
            product: { deletedAt: null, isPublished: true },
          },
        },
      },
    });
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    // Validate product exists, is published, and not deleted
    const product = await this.prisma.product.findFirst({
      where: {
        id: addToCartDto.productId,
        isPublished: true,
        deletedAt: null,
      },
      select: {
        id: true,
        stock: true,
        hasVariants: true,
        tenant: { select: { isActive: true } },
      },
    });

    if (!product) {
      throw new BadRequestException("Product not found or unavailable");
    }

    if (!product.tenant.isActive) {
      throw new BadRequestException("Store is currently inactive");
    }

    if (product.hasVariants && !addToCartDto.variantId) {
      throw new BadRequestException("Pilih variant terlebih dahulu");
    }

    if (!addToCartDto.variantId && product.stock < addToCartDto.quantity) {
      throw new BadRequestException(
        `Stok tidak cukup. Tersedia: ${product.stock}`,
      );
    }

    let variant:
      | { id: string; stock: number }
      | null = null;

    if (addToCartDto.variantId) {
      variant = await this.prisma.productVariant.findFirst({
        where: {
          id: addToCartDto.variantId,
          productId: addToCartDto.productId,
          isActive: true,
        },
        select: {
          id: true,
          stock: true,
        },
      });

      if (!variant) {
        throw new BadRequestException("Variant not found or unavailable");
      }

      if (variant.stock < addToCartDto.quantity) {
        throw new BadRequestException(
          `Stok variant tidak cukup. Tersedia: ${variant.stock}`,
        );
      }
    }

    const cart = await this.getOrCreateCart(userId);

    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: addToCartDto.productId,
        variantId: addToCartDto.variantId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + addToCartDto.quantity;
      const availableStock = variant?.stock ?? product.stock;
      if (newQuantity > availableStock) {
        throw new BadRequestException(
          `Stok tidak cukup. Tersedia: ${availableStock}, sudah di keranjang: ${existingItem.quantity}`,
        );
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          variant: { include: { options: true } },
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: addToCartDto.productId,
        variantId: addToCartDto.variantId || null,
        quantity: addToCartDto.quantity,
      },
      include: {
        product: true,
        variant: { include: { options: true } },
      },
    });
  }

  async updateCartItem(
    userId: string,
    itemId: string,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) throw new NotFoundException("Cart not found");

    // Validate stock if quantity is being updated
    if (updateCartItemDto.quantity) {
      const cartItem = await this.prisma.cartItem.findFirst({
        where: { id: itemId, cartId: cart.id },
        include: {
          product: { select: { stock: true, name: true } },
          variant: { select: { stock: true, name: true } },
        },
      });
      if (!cartItem) throw new NotFoundException("Cart item not found");
      const availableStock = cartItem.variant?.stock ?? cartItem.product.stock;
      if (updateCartItemDto.quantity > availableStock) {
        throw new BadRequestException(
          `Stok tidak cukup untuk "${cartItem.variant?.name || cartItem.product.name}". Tersedia: ${availableStock}`,
        );
      }
    }

    return this.prisma.cartItem.update({
      where: {
        id: itemId,
        cartId: cart.id,
      },
      data: updateCartItemDto,
      include: {
        product: true,
        variant: { include: { options: true } },
      },
    });
  }

  async removeCartItem(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) throw new NotFoundException("Cart not found");

    return this.prisma.cartItem.delete({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) throw new NotFoundException("Cart not found");

    return this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
  }

  async getCartTotal(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart) return 0;

    return cart.items.reduce(
      (total, item) =>
        total + (item.variant?.price || item.product.price) * item.quantity,
      0,
    );
  }

  /**
   * Checkout: convert entire cart into orders (grouped by tenant/seller)
   */
  async checkout(userId: string, checkoutDto: CheckoutDto) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                tenant: {
                  select: {
                    id: true,
                    ownerId: true,
                    name: true,
                    isActive: true,
                  },
                },
              },
            },
            variant: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    // Validate each product is still published, not deleted, and has sufficient stock
    for (const item of cart.items) {
      const freshProduct = await this.prisma.product.findFirst({
        where: {
          id: item.productId,
          isPublished: true,
          deletedAt: null,
        },
        select: {
          id: true,
          stock: true,
          hasVariants: true,
        },
      });

      if (!freshProduct) {
        throw new BadRequestException(
          `Product "${item.product.name}" is no longer available (unpublished or deleted)`,
        );
      }

      if (item.variantId) {
        const freshVariant = await this.prisma.productVariant.findFirst({
          where: {
            id: item.variantId,
            productId: item.productId,
            isActive: true,
          },
          select: {
            id: true,
            stock: true,
            name: true,
          },
        });

        if (!freshVariant || freshVariant.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant "${freshVariant?.name || item.variant?.name || item.product.name}". Available: ${freshVariant?.stock ?? 0}, requested: ${item.quantity}`,
          );
        }
      } else if (freshProduct.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${item.product.name}". Available: ${freshProduct.stock}, requested: ${item.quantity}`,
        );
      }
    }

    // Group items by tenant
    const itemsByTenant = new Map<
      string,
      {
        tenantId: string;
        sellerId: string;
        tenantName: string;
        items: typeof cart.items;
      }
    >();

    for (const item of cart.items) {
      if (!item.product.tenant.isActive) {
        throw new BadRequestException(
          `Store "${item.product.tenant.name}" is currently inactive`,
        );
      }
      if (item.product.tenant.ownerId === userId) {
        throw new BadRequestException(
          `You cannot buy your own product: "${item.product.name}"`,
        );
      }

      const key = item.product.tenantId;
      if (!itemsByTenant.has(key)) {
        itemsByTenant.set(key, {
          tenantId: item.product.tenantId,
          sellerId: item.product.tenant.ownerId,
          tenantName: item.product.tenant.name,
          items: [],
        });
      }
      itemsByTenant.get(key)!.items.push(item);
    }

    const orders = [];

    // Create one order per tenant
    for (const [, group] of itemsByTenant) {
      const totalAmount = group.items.reduce(
        (sum, item) =>
          sum + (item.variant?.price || item.product.price) * item.quantity,
        0,
      );

      // Wrap order creation AND stock decrement in a single atomic transaction
      const order = await this.prisma.$transaction(async (tx) => {
        // Re-verify stock inside transaction to prevent race conditions
        for (const item of group.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, name: true, hasVariants: true },
          });
          if (!product) {
            throw new BadRequestException(
              `Product "${item.product.name}" is no longer available`,
            );
          }

          if (item.variantId) {
            const variant = await tx.productVariant.findFirst({
              where: {
                id: item.variantId,
                productId: item.productId,
                isActive: true,
              },
              select: {
                stock: true,
                name: true,
              },
            });

            if (!variant || variant.stock < item.quantity) {
              throw new BadRequestException(
                `Insufficient stock for variant "${variant?.name || item.variant?.name || item.product.name}". Available: ${variant?.stock ?? 0}`,
              );
            }
          } else if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name || item.product.name}". Available: ${product.stock ?? 0}`,
            );
          }
        }

        // Resolve shipping info (from DTO or saved address)
        let shipping = checkoutDto.shipping;
        if (checkoutDto.savedAddressId && !shipping) {
          const saved = await tx.shippingAddress.findFirst({
            where: { id: checkoutDto.savedAddressId, userId },
          });
          if (saved) {
            shipping = {
              name: saved.name,
              phone: saved.phone,
              address: saved.address,
              province: saved.province,
              city: saved.city,
              district: saved.district,
              postalCode: saved.postalCode,
            };
          }
        }

        const createdOrder = await tx.order.create({
          data: {
            tenantId: group.tenantId,
            buyerId: userId,
            sellerId: group.sellerId,
            title: `Order from ${group.tenantName}`,
            description: checkoutDto.notes || null,
            amount: totalAmount,
            escrowAmount: totalAmount,
            status: OrderStatus.PENDING_PAYMENT,
            paymentCode: this.generatePaymentCode(),
            paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
            // Shipping info snapshot
            shippingName: shipping?.name,
            shippingPhone: shipping?.phone,
            shippingAddress: shipping?.address,
            shippingProvince: shipping?.province,
            shippingCity: shipping?.city,
            shippingDistrict: shipping?.district,
            shippingPostalCode: shipping?.postalCode,
            shippingNotes: shipping?.notes,
            orderItems: {
              create: group.items.map((item) => ({
                productId: item.productId,
                variantId: item.variantId,
                variantName: item.variant?.name,
                variantOptions: item.variant?.options || undefined,
                quantity: item.quantity,
                unitPrice: item.variant?.price || item.product.price,
                totalPrice:
                  (item.variant?.price || item.product.price) * item.quantity,
              })),
            },
          },
          include: { orderItems: true },
        });

        // Decrease stock atomically within the same transaction
        for (const item of group.items) {
          if (item.variantId) {
            await tx.productVariant.update({
              where: { id: item.variantId },
              data: { stock: { decrement: item.quantity } },
            });
          } else {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }

        // Create escrow transaction within the same transaction
        await tx.transaction.create({
          data: {
            userId,
            type: "ESCROW_HOLD",
            amount: totalAmount,
            fee: 0,
            netAmount: totalAmount,
            status: "COMPLETED",
            orderId: createdOrder.id,
            description: `Escrow hold for order from ${group.tenantName}`,
          },
        });

        return createdOrder;
      });

      // Create chat room for order (outside transaction - not critical for atomicity)
      await this.prisma.chatRoom.create({
        data: {
          tenantId: group.tenantId,
          orderId: order.id,
          participants: {
            connect: [{ id: userId }, { id: group.sellerId }],
          },
        },
      });

      // Notify seller
      const sellerUser = await this.prisma.user.findUnique({
        where: { id: group.sellerId },
        select: { email: true },
      });
      if (sellerUser) {
        await this.notifEvents.onOrderCreated({
          tenantId: group.tenantId,
          sellerId: group.sellerId,
          sellerEmail: sellerUser.email,
          orderTitle: order.title,
          orderId: order.id,
        });
      }

      orders.push(order);
    }

    // Clear cart
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return {
      message: `Checkout successful. Please complete payment within 24 hours.`,
      orders: orders.map(o => ({
        id: o.id,
        tenantId: o.tenantId,
        sellerId: o.sellerId,
        title: o.title,
        amount: o.amount,
        paymentCode: o.paymentCode,
        paymentDeadline: o.paymentDeadline,
        status: o.status
      })),
    };
  }

  /**
   * Direct purchase: buy a single product without cart
   */
  async directPurchase(userId: string, dto: DirectPurchaseDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isPublished: true, deletedAt: null },
      include: {
        tenant: {
          select: { id: true, ownerId: true, name: true, isActive: true },
        },
      },
    });

    if (!product) {
      throw new BadRequestException("Product not found");
    }

    if (!product.tenant.isActive) {
      throw new BadRequestException("Store is currently inactive");
    }

    if (product.hasVariants && !dto.variantId) {
      throw new BadRequestException("Please select a variant");
    }

    if (!dto.variantId && product.stock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    let variant:
      | {
          id: string;
          name: string;
          price: number | null;
          stock: number;
          options: { optionName: string; optionValue: string }[];
        }
      | null = null;

    if (dto.variantId) {
      variant = await this.prisma.productVariant.findFirst({
        where: {
          id: dto.variantId,
          productId: dto.productId,
          isActive: true,
        },
        include: {
          options: true,
        },
      });

      if (!variant) {
        throw new BadRequestException("Variant not found");
      }

      if (variant.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient variant stock. Available: ${variant.stock}`,
        );
      }
    }

    if (product.tenant.ownerId === userId) {
      throw new BadRequestException("You cannot buy your own product");
    }

    const unitPrice = variant?.price || product.price;
    const totalAmount = unitPrice * dto.quantity;

    // Use transaction to ensure atomicity (order + stock + escrow)
    const order = await this.prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction
      const freshProduct = await tx.product.findUnique({
        where: { id: product.id },
        select: { stock: true },
      });
      if (!freshProduct) {
        throw new BadRequestException("Product is no longer available");
      }

      if (variant) {
        const freshVariant = await tx.productVariant.findUnique({
          where: { id: variant.id },
          select: { stock: true },
        });
        if (!freshVariant || freshVariant.stock < dto.quantity) {
          throw new BadRequestException(
            `Insufficient variant stock. Available: ${freshVariant?.stock ?? 0}`,
          );
        }
      } else if (freshProduct.stock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${freshProduct.stock ?? 0}`,
        );
      }

      // Resolve shipping info
      let shipping = dto.shipping;
      if (dto.savedAddressId && !shipping) {
        const saved = await tx.shippingAddress.findFirst({
          where: { id: dto.savedAddressId, userId },
        });
        if (saved) {
          shipping = {
            name: saved.name,
            phone: saved.phone,
            address: saved.address,
            province: saved.province,
            city: saved.city,
            district: saved.district,
            postalCode: saved.postalCode,
          };
        }
      }

      const newOrder = await tx.order.create({
        data: {
          tenantId: product.tenantId,
          buyerId: userId,
          sellerId: product.tenant.ownerId,
          title: `Purchase: ${product.name}`,
          description: dto.notes || null,
          amount: totalAmount,
          escrowAmount: totalAmount,
          status: OrderStatus.PENDING_PAYMENT,
          paymentCode: this.generatePaymentCode(),
          paymentDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
          // Shipping info snapshot
          shippingName: shipping?.name,
          shippingPhone: shipping?.phone,
          shippingAddress: shipping?.address,
          shippingProvince: shipping?.province,
          shippingCity: shipping?.city,
          shippingDistrict: shipping?.district,
          shippingPostalCode: shipping?.postalCode,
          shippingNotes: shipping?.notes,
          orderItems: {
            create: [
              {
                productId: product.id,
                variantId: variant?.id,
                variantName: variant?.name,
                variantOptions: variant?.options || undefined,
                quantity: dto.quantity,
                unitPrice,
                totalPrice: totalAmount,
              },
            ],
          },
        },
        include: { orderItems: true },
      });

      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: dto.quantity } },
        });
      } else {
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: dto.quantity } },
        });
      }

      // Create escrow transaction
      await tx.transaction.create({
        data: {
          userId,
          type: "ESCROW_HOLD",
          amount: totalAmount,
          fee: 0,
          netAmount: totalAmount,
          status: "COMPLETED",
          orderId: newOrder.id,
          description: `Escrow hold for purchase: ${product.name}`,
        },
      });

      // Create chat room
      await tx.chatRoom.create({
        data: {
          tenantId: product.tenantId,
          orderId: newOrder.id,
          participants: {
            connect: [{ id: userId }, { id: product.tenant.ownerId }],
          },
        },
      });

      return newOrder;
    });

    // Notify seller (outside transaction - non-critical)
    const sellerUser = await this.prisma.user.findUnique({
      where: { id: product.tenant.ownerId },
      select: { email: true },
    });
    if (sellerUser) {
      await this.notifEvents.onOrderCreated({
        tenantId: product.tenantId,
        sellerId: product.tenant.ownerId,
        sellerEmail: sellerUser.email,
        orderTitle: order.title,
        orderId: order.id,
      });
    }

    return {
      message: "Purchase successful. Please complete payment within 24 hours.",
      order: {
        id: order.id,
        tenantId: order.tenantId,
        sellerId: order.sellerId,
        title: order.title,
        amount: order.amount,
        paymentCode: order.paymentCode,
        paymentDeadline: order.paymentDeadline,
        status: order.status,
      },
    };
  }
}
