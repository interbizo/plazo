import {
  Injectable,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { AddWishlistDto } from "./wishlist.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async addToWishlist(userId: string, dto: AddWishlistDto) {
    if (dto.productId && dto.serviceId) {
      throw new BadRequestException("Cannot add both product and service in one wishlist entry");
    }
    if (!dto.productId && !dto.serviceId) {
      throw new BadRequestException("Either productId or serviceId is required");
    }

    if (dto.productId) {
      const existing = await this.prisma.wishlist.findUnique({
        where: { userId_productId: { userId, productId: dto.productId } },
      });
      if (existing) {
        throw new ConflictException("Already in wishlist");
      }
    }

    if (dto.serviceId) {
      const existing = await this.prisma.wishlist.findUnique({
        where: { userId_serviceId: { userId, serviceId: dto.serviceId } },
      });
      if (existing) {
        throw new ConflictException("Already in wishlist");
      }
    }

    const wishlist = await this.prisma.wishlist.create({
      data: {
        userId,
        productId: dto.productId || null,
        serviceId: dto.serviceId || null,
      },
    });

    return { message: "Added to wishlist", wishlist };
  }

  async getWishlist(userId: string, page: number = 1, limit: number = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [items, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { userId },
        skip,
        take,
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
              tenant: { select: { id: true, name: true, subdomain: true } },
            },
          },
          service: {
            include: {
              category: { select: { id: true, name: true, slug: true } },
              tenant: { select: { id: true, name: true, subdomain: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.wishlist.count({ where: { userId } }),
    ]);

    return PaginationHelper.formatPaginatedResponse(items, total, page, limit);
  }

  async removeFromWishlist(userId: string, wishlistId: string) {
    const item = await this.prisma.wishlist.findFirst({
      where: { id: wishlistId, userId },
    });

    if (!item) {
      throw new BadRequestException("Wishlist item not found");
    }

    await this.prisma.wishlist.delete({ where: { id: wishlistId } });
    return { message: "Removed from wishlist" };
  }

  async removeFromWishlistByTarget(userId: string, dto: AddWishlistDto) {
    if (dto.productId && dto.serviceId) {
      throw new BadRequestException(
        "Cannot remove both product and service in one request",
      );
    }
    if (!dto.productId && !dto.serviceId) {
      throw new BadRequestException("Either productId or serviceId is required");
    }

    const item = await this.prisma.wishlist.findFirst({
      where: {
        userId,
        ...(dto.productId ? { productId: dto.productId } : {}),
        ...(dto.serviceId ? { serviceId: dto.serviceId } : {}),
      },
    });

    if (!item) {
      throw new BadRequestException("Wishlist item not found");
    }

    await this.prisma.wishlist.delete({ where: { id: item.id } });
    return { message: "Removed from wishlist" };
  }

  async isInWishlist(userId: string, productId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    return { isWishlisted: !!item, isWished: !!item };
  }

  async isServiceInWishlist(userId: string, serviceId: string) {
    const item = await this.prisma.wishlist.findUnique({
      where: { userId_serviceId: { userId, serviceId } },
    });
    return { isWishlisted: !!item, isWished: !!item };
  }
}
