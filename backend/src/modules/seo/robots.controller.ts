import { Controller, Get, Req, Res, Header } from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from '@modules/database/prisma.service';

@Controller()
export class RobotsController {
  constructor(private prisma: PrismaService) {}

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('Expires', '0')
  async getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    try {
      const host = req.get('host') || '';
      const protocol = req.protocol || 'https';
      
      // Extract subdomain
      const subdomain = this.extractSubdomain(host);
      
      let content: string;

      if (subdomain) {
        // Subdomain (seller store) - check SEO status
        const tenant = await this.prisma.tenant.findUnique({
          where: { subdomain },
          select: {
            subscriptionPlan: true,
            isSeoActive: true,
            isActive: true,
            isVerified: true,
          },
        });

        if (!tenant || !tenant.isActive) {
          // Inactive tenant - block all
          content = this.generateBlockedRobotsTxt(host);
        } else if (tenant.isSeoActive) {
          // SEO Active - allow indexing
          content = this.generatePremiumRobotsTxt(host, protocol);
        } else {
          // SEO not active - block indexing
          content = this.generateNonPremiumRobotsTxt(host);
        }
      } else {
        // Main domain - always allow
        content = this.generateMainDomainRobotsTxt(host, protocol);
      }

      // Set additional headers to bypass Cloudflare cache
      res.setHeader('CF-Cache-Status', 'BYPASS');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('CDN-Cache-Control', 'no-store');
      
      return res.send(content);
    } catch (error) {
      console.error('[Robots.txt] Error:', error);
      // Fallback to safe default (block all)
      return res.send(this.generateBlockedRobotsTxt(req.get('host') || ''));
    }
  }

  private extractSubdomain(host: string): string | null {
    // Remove port if exists
    const hostWithoutPort = host.split(':')[0];
    const parts = hostWithoutPort.split('.');

    // localhost or single domain
    if (parts.length < 2) return null;

    // Check if it's a subdomain (not www, api, or main domain)
    const firstPart = parts[0];
    if (firstPart === 'www' || firstPart === 'api' || firstPart === 'localhost') {
      return null;
    }

    // If more than 2 parts, first part is subdomain
    if (parts.length >= 3) {
      return firstPart;
    }

    return null;
  }

  private generatePremiumRobotsTxt(host: string, protocol: string): string {
    return `# Premium Store - Full Indexing Allowed
User-agent: *
Allow: /

# Disallow admin/private areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /preview/
Disallow: /draft/

# Allow important pages
Allow: /products/
Allow: /services/
Allow: /portfolio/
Allow: /about/

# Sitemap
Sitemap: ${protocol}://${host}/sitemap.xml

# Crawl-delay to prevent overload
Crawl-delay: 1

# Last updated: ${new Date().toISOString()}
`;
  }

  private generateNonPremiumRobotsTxt(host: string): string {
    return `# Non-Premium Store - Indexing Restricted
User-agent: *
Disallow: /

# Block all crawlers for non-premium stores
# Upgrade to premium to enable SEO indexing

# Last updated: ${new Date().toISOString()}
`;
  }

  private generateBlockedRobotsTxt(host: string): string {
    return `# Inactive or Invalid Store
User-agent: *
Disallow: /

# Last updated: ${new Date().toISOString()}
`;
  }

  private generateMainDomainRobotsTxt(host: string, protocol: string): string {
    return `# Main Marketplace Domain
User-agent: *
Allow: /

# Disallow private areas
Disallow: /dashboard/
Disallow: /admin/
Disallow: /seller/
Disallow: /login
Disallow: /register
Disallow: /api/
Disallow: /search?q=*
Disallow: /*?page=*
Disallow: /*?sort=*

# Allow public pages
Allow: /products/
Allow: /services/
Allow: /store/
Allow: /about
Allow: /contact

# Sitemaps
Sitemap: ${protocol}://${host}/sitemap.xml
Sitemap: ${protocol}://${host}/sitemaps/stores-1.xml
Sitemap: ${protocol}://${host}/sitemaps/products-1.xml
Sitemap: ${protocol}://${host}/sitemaps/services-1.xml

# Crawl-delay
Crawl-delay: 1

# Last updated: ${new Date().toISOString()}
`;
  }
}
