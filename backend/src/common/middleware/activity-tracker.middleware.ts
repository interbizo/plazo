import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "../../modules/database/prisma.service";

@Injectable()
export class ActivityTrackerMiddleware implements NestMiddleware {
  // In-memory cache: userId → last update timestamp
  private lastUpdateMap = new Map<string, number>();
  private readonly THROTTLE_MS = 60_000; // 60 seconds

  constructor(private prisma: PrismaService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (userId) {
      const now = Date.now();
      const lastUpdate = this.lastUpdateMap.get(userId) || 0;

      // Only update if more than 60 seconds since last update
      if (now - lastUpdate > this.THROTTLE_MS) {
        this.lastUpdateMap.set(userId, now);
        this.prisma.user
          .update({
            where: { id: userId },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {});
      }
    }

    next();
  }
}
