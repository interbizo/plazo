import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { SubscriptionPlan } from "@prisma/client";

const ROOT_DOMAIN = "plazo.id";

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);

  constructor(private prisma: PrismaService) {}

  private normalizeHost(host?: string): string {
    return (host ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
  }

  private isMainDomainHost(host?: string): boolean {
    const hostname = this.normalizeHost(host);
    return hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
  }

  private isPaid(plan: SubscriptionPlan): boolean {
    return plan !== SubscriptionPlan.FREE;
  }

  private canIndex(
    tenant?: {
      isActive: boolean | null;
      subscriptionPlan: SubscriptionPlan;
    } | null,
  ): boolean {
    return Boolean(tenant?.isActive && this.isPaid(tenant.subscriptionPlan));
  }

  /**
   * Generate robots.txt from the normalized host and tenant plan/status.
   * Called per-request so subscription changes take effect without stale cache.
   */
  async generateRobotsTxt(subdomain?: string, fullHost?: string): Promise<string> {
    try {
      if (subdomain) {
        const hostname = this.normalizeHost(fullHost);
        if (
          !hostname.endsWith(`.${ROOT_DOMAIN}`) ||
          hostname.slice(0, -(ROOT_DOMAIN.length + 1)) !== subdomain
        ) {
          return this.generateDisallowRobotsTxt("Unrecognized tenant host");
        }

        return await this.generateTenantRobotsTxt(subdomain, fullHost);
      }

      if (this.isMainDomainHost(fullHost)) {
        return this.generateMainDomainRobotsTxt(fullHost);
      }

      return this.generateDisallowRobotsTxt("Unrecognized host");
    } catch (error) {
      this.logger.error("Error generating robots.txt:", error);

      if (this.isMainDomainHost(fullHost)) {
        return this.generateMainDomainRobotsTxt(fullHost);
      }

      return this.generateDisallowRobotsTxt("Error generating robots.txt");
    }
  }

  /**
   * Generate robots.txt for a specific tenant subdomain.
   * Indexes active tenants with a paid subscription plan.
   */
  private async generateTenantRobotsTxt(subdomain: string, fullHost?: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        subdomain: true,
        isActive: true,
        subscriptionPlan: true,
      },
    });

    if (!tenant || !tenant.isActive) {
      this.logger.debug(`[robots.txt] Tenant "${subdomain}" not found or inactive → DISALLOW`);
      return this.generateDisallowRobotsTxt("Store not found or inactive");
    }

    if (!this.isPaid(tenant.subscriptionPlan)) {
      this.logger.debug(`[robots.txt] Tenant "${subdomain}" on FREE plan → DISALLOW`);
      return this.generateDisallowRobotsTxt(
        "SEO indexing requires a paid subscription. Upgrade to enable search engine visibility.",
      );
    }

    this.logger.debug(`[robots.txt] Tenant "${subdomain}" PAID + ACTIVE → ALLOW`);
    return this.generateSubscribedRobotsTxt(subdomain, fullHost);
  }

  /**
   * SUBSCRIBED PLAN — SEO ENABLED MODE
   * Allow search engines and AI crawlers to index public content.
   */
  private generateSubscribedRobotsTxt(subdomain: string, fullHost?: string): string {
    const normalizedHost = this.normalizeHost(fullHost);
    const baseUrl = normalizedHost
      ? `https://${normalizedHost}`
      : `https://${subdomain}.plazo.id`;

    return `# Robots.txt for ${subdomain}
# Status: SUBSCRIBED — SEO Indexing Enabled
# Generated: ${new Date().toISOString()}

# ============================================
# SEARCH ENGINE BOTS
# ============================================

User-agent: Googlebot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Allow: /register
Allow: /login
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

User-agent: Applebot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

# ============================================
# AI CRAWLERS (Allowed for subscribed tenants)
# ============================================

User-agent: GPTBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Crawl-delay: 2

User-agent: OAI-SearchBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: ClaudeBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Claude-SearchBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: PerplexityBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Amazonbot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Google-CloudVertexBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: FacebookBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 1

User-agent: Meta-ExternalAgent
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

# ============================================
# BLOCK AGGRESSIVE/SCRAPER BOTS
# ============================================

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Allow: /products
Allow: /services
Disallow: /
Crawl-delay: 5

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

# ============================================
# DEFAULT RULE (All other bots)
# ============================================

User-agent: *
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Allow: /register
Allow: /login
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

# ============================================
# SITEMAP
# ============================================

Sitemap: ${baseUrl}/sitemap.xml
`;
  }

  /**
   * FREE PLAN — NO INDEX MODE
   * Block ALL crawlers from indexing any content.
   */
  private generateDisallowRobotsTxt(reason: string): string {
    return `# Robots.txt
# Status: FREE PLAN — No Indexing
# Reason: ${reason}
# Generated: ${new Date().toISOString()}
#
# To enable SEO indexing, upgrade to a paid subscription plan.

User-agent: *
Disallow: /

# Search engines
User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /

User-agent: Applebot
Disallow: /

# AI crawlers
User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-SearchBot
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: Google-CloudVertexBot
Disallow: /
`;
  }

  /**
   * Main domain robots.txt (marketplace homepage).
   * Always allows indexing for the main platform.
   */
  private generateMainDomainRobotsTxt(fullHost?: string): string {
    const baseUrl = this.isMainDomainHost(fullHost)
      ? `https://${this.normalizeHost(fullHost)}`
      : `https://${ROOT_DOMAIN}`;

    return `# Robots.txt for Main Marketplace Platform
# Status: PLATFORM — Public Indexing Enabled
# Generated: ${new Date().toISOString()}

# ============================================
# SEARCH ENGINE BOTS
# ============================================

User-agent: Googlebot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Allow: /register
Allow: /login
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Disallow: /dashboard/
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

User-agent: Applebot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Crawl-delay: 1

# ============================================
# AI CRAWLERS
# ============================================

User-agent: GPTBot
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Disallow: /api/
Disallow: /admin/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Crawl-delay: 2

User-agent: OAI-SearchBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: ClaudeBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Claude-SearchBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: PerplexityBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Amazonbot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: Google-CloudVertexBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

User-agent: FacebookBot
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 1

User-agent: Meta-ExternalAgent
Allow: /
Allow: /products
Allow: /services
Disallow: /api/
Disallow: /admin/
Crawl-delay: 2

# ============================================
# BLOCK AGGRESSIVE/SCRAPER BOTS
# ============================================

User-agent: Bytespider
Disallow: /

User-agent: CCBot
Allow: /products
Allow: /services
Disallow: /
Crawl-delay: 5

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

# ============================================
# DEFAULT RULE
# ============================================

User-agent: *
Allow: /
Allow: /products
Allow: /services
Allow: /jobs
Allow: /register
Allow: /login
Disallow: /api/
Disallow: /admin/
Disallow: /_next/
Disallow: /seller/dashboard/
Disallow: /buyer/dashboard/
Disallow: /dashboard/
Disallow: /cart
Disallow: /checkout
Crawl-delay: 1

# ============================================
# SITEMAP
# ============================================

Sitemap: ${baseUrl}/sitemap.xml
`;
  }

  /**
   * Generate sitemap.xml for a tenant or main domain
   */
  async generateSitemapIndex(subdomain?: string): Promise<string> {
    if (subdomain) {
      return this.generateTenantSitemap(subdomain);
    }
    return this.generateMainSitemap();
  }

  private async generateTenantSitemap(subdomain: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        id: true,
        isActive: true,
        subscriptionPlan: true,
      },
    });

    if (!tenant || !this.canIndex(tenant)) {
      return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
    }

    const baseUrl = `https://${subdomain}.plazo.id`;
    const now = new Date().toISOString();

    // Fetch tenant's published products and services
    const [products, services] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        take: 1000,
      }),
      this.prisma.service.findMany({
        where: { tenantId: tenant.id, isPublished: true, deletedAt: null },
        select: { slug: true, updatedAt: true },
        take: 1000,
      }),
    ]);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    xml += `  <url><loc>${baseUrl}/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>\n`;

    // Products
    for (const product of products) {
      xml += `  <url><loc>${baseUrl}/products/${product.slug}</loc><lastmod>${product.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }

    // Services
    for (const service of services) {
      xml += `  <url><loc>${baseUrl}/services/${service.slug}</loc><lastmod>${service.updatedAt.toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
    }

    xml += '</urlset>';
    return xml;
  }

  private async generateMainSitemap(): Promise<string> {
    const baseUrl = process.env.APP_URL || "https://plazo.id";
    const now = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    xml += `  <sitemap><loc>${baseUrl}/sitemap-pages.xml</loc><lastmod>${now}</lastmod></sitemap>\n`;
    xml += `  <sitemap><loc>${baseUrl}/sitemap-tenants-1.xml</loc><lastmod>${now}</lastmod></sitemap>\n`;

    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Check whether a tenant is eligible for indexing.
   */
  async isSeoActive(subdomain: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: {
        isActive: true,
        subscriptionPlan: true,
      },
    });

    return this.canIndex(tenant);
  }

  /**
   * Get SEO meta tags for tenant (used by frontend for <meta> tags)
   */
  async getSeoMetaTags(subdomain: string): Promise<{
    robots: string;
    googlebot: string;
  }> {
    const active = await this.isSeoActive(subdomain);

    if (active) {
      return {
        robots: "index, follow",
        googlebot: "index, follow, max-image-preview:large, max-snippet:-1",
      };
    }

    return {
      robots: "noindex, nofollow",
      googlebot: "noindex, nofollow",
    };
  }
}
