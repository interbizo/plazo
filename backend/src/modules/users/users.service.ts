import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { UpdateProfileDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
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
        isActive: true,
        lastActiveAt: true,
        sellerProfile: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        bio: true,
        role: true,
      },
    });
  }

  async getSellerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user.sellerProfile;
  }

  async getSellerStats(userId: string) {
    const seller = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        sellerProfile: true,
        sellerOrders: {
          where: { status: "COMPLETED" },
        },
        reviewsReceived: true,
      },
    });

    if (!seller?.sellerProfile) {
      throw new NotFoundException("Seller profile not found");
    }

    return {
      totalEarnings: seller.sellerProfile.totalEarnings,
      totalOrders: seller.sellerOrders.length,
      averageRating: seller.sellerProfile.averageRating,
      totalReviews: seller.reviewsReceived.length,
    };
  }

  async searchUsers(query: string, limit = 10) {
    if (!query || query.length < 2) return [];
    return this.prisma.user.findMany({
      where: {
        OR: [
          { firstName: { contains: query, mode: "insensitive" as const } },
          { lastName: { contains: query, mode: "insensitive" as const } },
        ],
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
      },
      take: limit,
    });
  }

  async getUserPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        createdAt: true,
        sellerProfile: {
          select: {
            averageRating: true,
            totalOrders: true,
            totalReviews: true,
            level: true,
            skills: true,
            bio: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
