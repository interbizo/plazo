import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@modules/database/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  // Bounded cache: tracks last activity update per user to throttle DB writes.
  // Entries auto-expire after 2 minutes. Max 10,000 entries.
  private lastUpdateMap = new Map<string, number>();
  private readonly ACTIVITY_THROTTLE_MS = 60_000;
  private readonly MAX_MAP_SIZE = 10_000;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {
    // Cleanup stale entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanupStaleEntries(), 5 * 60 * 1000);
  }

  private cleanupStaleEntries() {
    const now = Date.now();
    const expiry = 2 * 60 * 1000; // 2 minutes
    for (const [key, timestamp] of this.lastUpdateMap) {
      if (now - timestamp > expiry) {
        this.lastUpdateMap.delete(key);
      }
    }
    // Hard cap: if still too large, clear oldest half
    if (this.lastUpdateMap.size > this.MAX_MAP_SIZE) {
      const entries = [...this.lastUpdateMap.entries()].sort((a, b) => a[1] - b[1]);
      const toRemove = entries.slice(0, Math.floor(entries.length / 2));
      toRemove.forEach(([key]) => this.lastUpdateMap.delete(key));
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // Support token via query parameter for file streaming endpoints (e.g., images in <img> tags)
    let token: string;

    if (authHeader) {
      const [bearer, headerToken] = authHeader.split(" ");
      if (bearer !== "Bearer" || !headerToken) {
        throw new UnauthorizedException("Invalid authorization format");
      }
      token = headerToken;
    } else if (request.query?.token) {
      // Fallback: token from query parameter (for file/image endpoints only)
      token = request.query.token as string;
    } else {
      throw new UnauthorizedException("No authorization header");
    }

    try {
      const decoded = this.jwtService.verify(token);

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          accountStatus: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException("User account not found");
      }

      // Allow suspended users to access appeal endpoints and auth endpoints only
      const requestUrl = request.url || request.originalUrl || "";
      const isAppealRoute =
        requestUrl.includes("/api/account-appeal") ||
        requestUrl.includes("/api/auth/");

      // Block suspended/under_appeal users from ALL routes except appeal & auth
      if (
        (user.accountStatus === "SUSPENDED" || user.accountStatus === "UNDER_APPEAL") &&
        !isAppealRoute
      ) {
        throw new UnauthorizedException(
          "Akun Anda di-suspend. Silakan ajukan banding melalui halaman appeal.",
        );
      }

      // Block inactive users (banned, deleted, etc.) that are NOT suspended
      if (!user.isActive && user.accountStatus === "ACTIVE" && !isAppealRoute) {
        throw new UnauthorizedException("User account is inactive or deleted");
      }

      const now = Date.now();
      const lastUpdate = this.lastUpdateMap.get(user.id) || 0;
      if (now - lastUpdate > this.ACTIVITY_THROTTLE_MS) {
        this.lastUpdateMap.set(user.id, now);
        this.prisma.user
          .update({
            where: { id: user.id },
            data: { lastActiveAt: new Date(now) },
          })
          .catch(() => {});
      }

      request.user = { ...decoded, id: user.id, role: user.role, accountStatus: user.accountStatus };
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid token");
    }
  }
}
