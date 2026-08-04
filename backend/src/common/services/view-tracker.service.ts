import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";

/**
 * View Tracking Service — Anti-spam, memory-efficient, scalable.
 *
 * Strategy:
 * - Uses a bounded in-memory Set to track recent views (IP + itemId)
 * - Cooldown: same IP can only count as 1 view per item per 30 minutes
 * - Batch flush: increments DB counter periodically (every 30s) to reduce DB writes
 * - Memory cap: max 50,000 entries, auto-cleanup oldest when exceeded
 * - No memory leak: entries auto-expire, periodic cleanup runs
 */

type ViewItemType = "product" | "service" | "article";

interface PendingView {
  type: ViewItemType;
  itemId: string;
  count: number;
}

@Injectable()
export class ViewTrackerService {
  private readonly logger = new Logger(ViewTrackerService.name);

  // Track unique views: "ip:type:itemId" -> timestamp
  private readonly recentViews = new Map<string, number>();
  private readonly COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes per IP per item
  private readonly MAX_ENTRIES = 50_000;

  // Batch pending view increments: "type:itemId" -> count
  private readonly pendingIncrements = new Map<string, PendingView>();
  private flushTimer: ReturnType<typeof setInterval>;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(private prisma: PrismaService) {
    // Flush pending increments to DB every 30 seconds
    this.flushTimer = setInterval(() => this.flushPendingViews(), 30_000);

    // Cleanup expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanupExpired(), 5 * 60 * 1000);
  }

  /**
   * Record a view for a marketplace item.
   * Returns true if the view was counted (unique), false if duplicate (cooldown).
   */
  trackView(
    type: ViewItemType,
    itemId: string,
    ip: string,
    userId?: string,
  ): boolean {
    // Create unique key: prefer userId over IP for logged-in users
    const identifier = userId || ip || "anonymous";
    const key = `${identifier}:${type}:${itemId}`;

    const now = Date.now();
    const lastView = this.recentViews.get(key);

    // Check cooldown
    if (lastView && now - lastView < this.COOLDOWN_MS) {
      return false; // Duplicate — don't count
    }

    // Record this view
    this.recentViews.set(key, now);

    // Add to pending batch increment
    const batchKey = `${type}:${itemId}`;
    const existing = this.pendingIncrements.get(batchKey);
    if (existing) {
      existing.count++;
    } else {
      this.pendingIncrements.set(batchKey, { type, itemId, count: 1 });
    }

    // Enforce memory cap
    if (this.recentViews.size > this.MAX_ENTRIES) {
      this.evictOldest();
    }

    return true;
  }

  /**
   * Get current view count for an item (from DB).
   */
  async getViewCount(type: ViewItemType, itemId: string): Promise<number> {
    const pendingCount = this.pendingIncrements.get(`${type}:${itemId}`)?.count || 0;

    if (type === "product") {
      const product = await this.prisma.product.findUnique({
        where: { id: itemId },
        select: { viewCount: true },
      });
      return (product?.viewCount || 0) + pendingCount;
    }

    if (type === "service") {
      const service = await this.prisma.service.findUnique({
        where: { id: itemId },
        select: { viewCount: true },
      });
      return (service?.viewCount || 0) + pendingCount;
    }

    const article = await this.prisma.article.findUnique({
      where: { id: itemId },
      select: { viewCount: true },
    });
    return (article?.viewCount || 0) + pendingCount;
  }

  /**
   * Flush all pending view increments to the database in batch.
   * Runs every 30 seconds to minimize DB writes.
   */
  private async flushPendingViews() {
    if (this.pendingIncrements.size === 0) return;

    // Take snapshot and clear pending
    const batch = new Map(this.pendingIncrements);
    this.pendingIncrements.clear();

    try {
      const promises: Promise<unknown>[] = [];

      for (const [, view] of batch) {
        if (view.type === "product") {
          promises.push(
            this.prisma.product.update({
              where: { id: view.itemId },
              data: { viewCount: { increment: view.count } },
            }).catch(() => {}), // Ignore if product deleted
          );
        } else if (view.type === "service") {
          promises.push(
            this.prisma.service.update({
              where: { id: view.itemId },
              data: { viewCount: { increment: view.count } },
            }).catch(() => {}),
          );
        } else {
          promises.push(
            this.prisma.article.update({
              where: { id: view.itemId },
              data: { viewCount: { increment: view.count } },
            }).catch(() => {}),
          );
        }
      }

      await Promise.all(promises);
    } catch (error) {
      this.logger.error("Failed to flush view counts:", error);
      // Re-add failed increments back to pending (best effort)
      for (const [key, view] of batch) {
        const existing = this.pendingIncrements.get(key);
        if (existing) {
          existing.count += view.count;
        } else {
          this.pendingIncrements.set(key, view);
        }
      }
    }
  }

  /**
   * Remove expired entries from recentViews map.
   */
  private cleanupExpired() {
    const now = Date.now();
    let removed = 0;
    for (const [key, timestamp] of this.recentViews) {
      if (now - timestamp > this.COOLDOWN_MS) {
        this.recentViews.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      this.logger.debug(`View tracker cleanup: removed ${removed} expired entries, ${this.recentViews.size} remaining`);
    }
  }

  /**
   * Evict oldest entries when memory cap is exceeded.
   */
  private evictOldest() {
    const entries = [...this.recentViews.entries()].sort((a, b) => a[1] - b[1]);
    const toRemove = entries.slice(0, Math.floor(entries.length / 4)); // Remove oldest 25%
    toRemove.forEach(([key]) => this.recentViews.delete(key));
  }
}
