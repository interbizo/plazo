import { Controller, Get, Res, Req, Header } from "@nestjs/common";
import { Response, Request } from "express";
import { SeoService } from "./seo.service";

const ROOT_DOMAIN = "plazo.id";
const RESERVED_SUBDOMAINS = new Set(["www", "api", "admin", "mail"]);
const MAIN_DOMAIN_ROBOTS_FALLBACK = `User-agent: *
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

Sitemap: https://${ROOT_DOMAIN}/sitemap.xml
`;
const DISALLOW_ROBOTS_FALLBACK = `User-agent: *
Disallow: /
`;
const EMPTY_SITEMAP =
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';

@Controller()
export class SeoController {
  constructor(private seoService: SeoService) {}

  /**
   * Dynamic robots.txt endpoint
   * - Bypasses Cloudflare cache
   * - Dynamic based on tenant/premium status
   * - No Cloudflare managed content
   */
  @Get("robots.txt")
  @Header("Content-Type", "text/plain")
  @Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0")
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async getRobotsTxt(@Req() req: Request, @Res() res: Response) {
    const host = (req.get("x-forwarded-host") || req.get("host") || "")
      .split(",")[0]
      .trim()
      .toLowerCase();

    try {
      const subdomain = this.extractSubdomain(host);
      const robotsTxt = await this.seoService.generateRobotsTxt(subdomain, host);

      res.set({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Cloudflare-CDN-Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "CF-Cache-Status": "BYPASS",
      });

      res.send(robotsTxt);
    } catch (error) {
      console.error("[SEO] Error generating robots.txt:", error);

      if (this.isMainDomainHost(host)) {
        res.send(MAIN_DOMAIN_ROBOTS_FALLBACK);
        return;
      }

      res.send(DISALLOW_ROBOTS_FALLBACK);
    }
  }

  /**
   * Sitemap index endpoint for the main domain or a recognized tenant.
   */
  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml")
  @Header("Cache-Control", "public, max-age=3600, s-maxage=3600")
  async getSitemapIndex(@Req() req: Request, @Res() res: Response) {
    try {
      const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      const subdomain = this.extractSubdomain(host);

      if (!subdomain && !this.isMainDomainHost(host)) {
        res
          .status(200)
          .set("Content-Type", "application/xml; charset=utf-8")
          .send(EMPTY_SITEMAP);
        return;
      }

      const sitemap = await this.seoService.generateSitemapIndex(subdomain || undefined);

      res.set({
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      });

      res.send(sitemap);
    } catch (error) {
      console.error("[SEO] Error generating sitemap:", error);
      res.status(200).set("Content-Type", "application/xml").send(
        EMPTY_SITEMAP
      );
    }
  }

  /**
   * Extract subdomain from host
   */
  private extractSubdomain(host: string): string | undefined {
    const hostname = this.normalizeHost(host);
    if (!hostname || hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return undefined;
    }

    if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) {
      return undefined;
    }

    const suffix = `.${ROOT_DOMAIN}`;
    if (!hostname.endsWith(suffix)) {
      return undefined;
    }

    const subdomain = hostname.slice(0, -suffix.length);
    if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
      return undefined;
    }

    return subdomain;
  }

  private isMainDomainHost(host: string): boolean {
    const hostname = this.normalizeHost(host);
    return hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`;
  }

  private normalizeHost(host: string): string {
    return host
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "")
      .replace(/\.$/, "");
  }
}
