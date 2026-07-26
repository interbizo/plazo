import { Injectable } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { SellerLevel } from "@prisma/client";

@Injectable()
export class SellerLevelsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Seller Level Criteria:
   * NEW: Default for all sellers
   * LEVEL_1: 10+ completed orders, 4.0+ rating, 60+ days active
   * LEVEL_2: 50+ completed orders, 4.5+ rating, 120+ days active
   * TOP_RATED: 100+ completed orders, 4.8+ rating, 365+ days active, 95%+ completion rate
   */
  async evaluateSellerLevel(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (!profile) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    if (!user) return null;

    const daysActive = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const totalOrders = await this.prisma.order.count({
      where: { sellerId: userId },
    });
    const completedOrders = await this.prisma.order.count({
      where: { sellerId: userId, status: "COMPLETED" },
    });
    const cancelledOrders = await this.prisma.order.count({
      where: { sellerId: userId, status: "CANCELLED" },
    });
    const completionRate =
      totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    let newLevel: SellerLevel = "NEW";

    if (
      completedOrders >= 100 &&
      profile.averageRating >= 4.8 &&
      daysActive >= 365 &&
      completionRate >= 95
    ) {
      newLevel = "TOP_RATED";
    } else if (
      completedOrders >= 50 &&
      profile.averageRating >= 4.5 &&
      daysActive >= 120
    ) {
      newLevel = "LEVEL_2";
    } else if (
      completedOrders >= 10 &&
      profile.averageRating >= 4.0 &&
      daysActive >= 60
    ) {
      newLevel = "LEVEL_1";
    }

    if (newLevel !== profile.level) {
      await this.prisma.sellerProfile.update({
        where: { userId },
        data: { level: newLevel, levelUpdatedAt: new Date() },
      });
    }

    return {
      currentLevel: newLevel,
      stats: {
        completedOrders,
        totalOrders,
        averageRating: profile.averageRating,
        daysActive,
        completionRate: Math.round(completionRate * 100) / 100,
      },
      nextLevel: this.getNextLevelRequirements(newLevel),
    };
  }

  private getNextLevelRequirements(currentLevel: SellerLevel) {
    switch (currentLevel) {
      case "NEW":
        return {
          level: "LEVEL_1",
          requirements: {
            completedOrders: 10,
            averageRating: 4.0,
            daysActive: 60,
          },
        };
      case "LEVEL_1":
        return {
          level: "LEVEL_2",
          requirements: {
            completedOrders: 50,
            averageRating: 4.5,
            daysActive: 120,
          },
        };
      case "LEVEL_2":
        return {
          level: "TOP_RATED",
          requirements: {
            completedOrders: 100,
            averageRating: 4.8,
            daysActive: 365,
            completionRate: 95,
          },
        };
      case "TOP_RATED":
        return null;
    }
  }

  async getSellerBadge(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        level: true,
        levelUpdatedAt: true,
        averageRating: true,
        totalOrders: true,
        totalReviews: true,
        totalEarnings: true,
      },
    });
    if (!profile) return null;

    return {
      level: profile.level,
      levelUpdatedAt: profile.levelUpdatedAt,
      badge: this.getLevelBadge(profile.level),
      stats: {
        averageRating: profile.averageRating,
        totalOrders: profile.totalOrders,
        totalReviews: profile.totalReviews,
      },
    };
  }

  private getLevelBadge(level: SellerLevel) {
    switch (level) {
      case "NEW":
        return { name: "New Seller", color: "#9CA3AF", icon: "seedling" };
      case "LEVEL_1":
        return { name: "Rising Talent", color: "#3B82F6", icon: "star" };
      case "LEVEL_2":
        return { name: "Top Seller", color: "#8B5CF6", icon: "crown" };
      case "TOP_RATED":
        return { name: "Top Rated", color: "#F59E0B", icon: "trophy" };
    }
  }
}
