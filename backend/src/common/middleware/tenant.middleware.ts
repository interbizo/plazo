import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { PrismaService } from "@modules/database/prisma.service";

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Routes that genuinely operate without tenant context.
   * Keep this list MINIMAL — only truly cross-tenant or global routes.
   */
  private readonly globalRoutePatterns = [
    // Auth is always global (login, register, verification, etc.)
    /^\/api\/auth\//,
    /^\/auth\//,
    // Admin panel operates across all tenants
    /^\/api\/admin\//,
    /^\/admin\//,
    // Forum is a cross-tenant community area
    /^\/api\/forum\//,
    // Public marketplace browsing (cross-tenant by design)
    /^\/api\/public\//,
    // Subscription plans listing (global)
    /^\/api\/subscription\/plans$/,
    // Upload is user-scoped, not tenant-scoped
    /^\/api\/upload($|\/|\?)/,
    // KYC is user-scoped verification
    /^\/api\/kyc\//,
    // Seller levels are global
    /^\/api\/seller-levels\//,
    // Categories are global
    /^\/api\/categories/,
    // Region data is global (provinces, cities, districts)
    /^\/api\/regions\//,
    // Location data is global (provinces, cities from Indonesia API)
    /^\/api\/location\//,
    // Address book is user-scoped
    /^\/api\/addresses/,
    // User profiles are global
    /^\/users\//,
    // Recommended tools are global (managed by super admin, accessed by seller)
    /^\/api\/recommended-tools/,
    // Subscription admin routes are global
    /^\/api\/subscription\/admin\//,
    /^\/api\/subscription\/current/,
    /^\/api\/subscription\/history/,
    /^\/api\/subscription\/change-plan/,
    /^\/api\/subscription\/cancel/,
    /^\/api\/subscription\/auto-renew/,
    /^\/api\/subscription\/payment/,
    // CMS routes are global (managed by super admin)
    /^\/api\/cms\//,
    // Reports are user-scoped, not tenant-scoped
    /^\/api\/reports/,
    // Physical verification is admin-managed
    /^\/api\/physical-verification/,
    // Tutorials are global
    /^\/api\/tutorials/,
    // Account appeal (user-scoped)
    /^\/api\/account-appeal/,
  ];

  /**
   * Routes that can work WITH or WITHOUT tenant context.
   * If tenant header is provided, it will be attached.
   * If not, the route proceeds without tenant (user-scoped operations).
   */
  private readonly optionalTenantPatterns = [
    // SEO files: work with or without tenant (dynamic per subdomain)
    /^\/robots\.txt$/,
    /^\/sitemap.*\.xml$/,
    // Orders: buyer/seller may access cross-tenant
    /^\/api\/orders\//,
    // Chat: participants may be cross-tenant
    /^\/api\/chat\//,
    // Notifications: user-scoped
    /^\/api\/notifications/,
    // Reviews: can be cross-tenant
    /^\/api\/reviews($|\/|\?)/,
    // Disputes: tied to orders (cross-tenant)
    /^\/api\/disputes\//,
    // Proposals: seller submits to buyer's tenant
    /^\/api\/proposals\//,
    // Custom offers: cross-tenant between buyer/seller
    /^\/api\/offers\//,
    // Wishlist: user-scoped
    /^\/api\/wishlist/,
    // Reports: user-scoped
    /^\/api\/reports\//,
    // Seller dashboard: operates on own tenant
    /^\/api\/seller\//,
    // Buyer dashboard: user-scoped
    /^\/api\/buyer\//,
    // Cart: user-scoped (items from multiple tenants)
    /^\/cart/,
    // Payment: cross-tenant (buyer pays seller's tenant)
    /^\/api\/payment\//,
    // Jobs: buyer creates jobs (user-scoped), but can be viewed with tenant context
    /^\/api\/jobs/,
  ];

  private isGlobalRoute(path: string): boolean {
    const isGlobal = this.globalRoutePatterns.some((pattern) =>
      pattern.test(path),
    );
    if (path.startsWith("/api/public") || path.startsWith("/api/categories")) {
      this.logger.debug(
        `[Tenant Middleware] Testing path: ${path} | isGlobal: ${isGlobal}`,
      );
      this.globalRoutePatterns.forEach((pattern, idx) => {
        this.logger.debug(
          `  Pattern ${idx}: ${pattern} | Match: ${pattern.test(path)}`,
        );
      });
    }
    return isGlobal;
  }

  private isOptionalTenantRoute(path: string): boolean {
    return this.optionalTenantPatterns.some((pattern) => pattern.test(path));
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const resolvedPath = this.resolvePath(req);

      // Log for debugging
      this.logger.debug(
        `[Tenant Middleware] ${req.method} ${resolvedPath} | URL: ${req.url}`,
      );

      // Global routes — skip tenant resolution entirely
      if (this.isGlobalRoute(resolvedPath)) {
        this.logger.debug(
          `[Tenant Middleware] Global route detected, skipping: ${resolvedPath}`,
        );
        next();
        return;
      }

      this.logger.debug(
        `[Tenant Middleware] Not a global route, checking tenant: ${resolvedPath}`,
      );

      // Extract subdomain from request
      const host = req.get("host") || "";
      const subdomain =
        (req.headers["x-tenant-subdomain"] as string) ||
        this.extractSubdomain(host);

      // Validate subdomain format to prevent injection
      if (subdomain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(subdomain)) {
        throw new BadRequestException("Invalid tenant subdomain format");
      }

      if (!subdomain) {
        if (this.isOptionalTenantRoute(resolvedPath)) {
          // Optional tenant route — proceed without tenant
          next();
          return;
        }
        // Tenant-scoped route requires a tenant
        throw new BadRequestException(
          "Tenant identification required. Provide a subdomain or x-tenant-subdomain header.",
        );
      }

      // Find tenant by subdomain
      const tenant = await this.prisma.tenant.findUnique({
        where: { subdomain },
        select: {
          id: true,
          subdomain: true,
          name: true,
          ownerId: true,
          isActive: true,
          subscriptionPlan: true,
          sellerTier: true,
        },
      });

      if (!tenant) {
        throw new BadRequestException("Tenant not found");
      }

      if (!tenant.isActive) {
        throw new BadRequestException("Tenant is currently suspended");
      }

      // Attach tenant to request
      (req as any)["tenant"] = tenant;
      next();
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({
          statusCode: 400,
          message: error.message,
          error: "Bad Request",
        });
      } else {
        this.logger.error("Tenant resolution failed", error?.stack);
        res.status(400).json({
          statusCode: 400,
          message: "Tenant resolution failed",
          error: "Bad Request",
        });
      }
    }
  }

  private extractSubdomain(host: string): string | null {
    // localhost:3000 -> null
    // seller1.localhost:3000 -> seller1
    // seller1.plazo.id -> seller1
    // seller1.plazo.com -> seller1
    const parts = host.split(".");

    if (parts.length < 2) {
      return null; // No subdomain
    }

    const firstPart = parts[0];
    // Filter out common non-subdomain prefixes
    if (
      firstPart === "localhost" ||
      firstPart === "www" ||
      firstPart === "api"
    ) {
      return null;
    }

    return firstPart;
  }

  private resolvePath(req: Request): string {
    const baseUrl = req.baseUrl || "";
    const rawPath = req.originalUrl || req.url || req.path || "";
    const pathOnly = rawPath.split("?")[0];

    if (baseUrl && pathOnly && !pathOnly.startsWith(baseUrl)) {
      return `${baseUrl}${pathOnly}`;
    }

    return pathOnly || req.path || "/";
  }
}
