import { Controller, Get, Res, Req, Header } from "@nestjs/common";
import { Response, Request } from "express";
import { SeoService } from "./seo.service";

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
    try {
      // Extract subdomain — check X-Forwarded-Host first (from frontend proxy), then Host
      const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      const subdomain = this.extractSubdomain(host);

      // Generate dynamic robots.txt
      const robotsTxt = await this.seoService.generateRobotsTxt(subdomain || undefined, host);

      // Send with proper headers to bypass ALL caches
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
      // Fallback to restrictive robots.txt
      const restrictiveRobots = `User-agent: *
Disallow: /

# SEO not available or error occurred`;
      res.send(restrictiveRobots);
    }
  }

  /**
   * Sitemap index endpoint
   * Only returns content for subscribed tenants with SEO active.
   */
  @Get("sitemap.xml")
  @Header("Content-Type", "application/xml")
  @Header("Cache-Control", "public, max-age=3600, s-maxage=3600")
  async getSitemapIndex(@Req() req: Request, @Res() res: Response) {
    try {
      const host = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
      const subdomain = this.extractSubdomain(host);

      const sitemap = await this.seoService.generateSitemapIndex(subdomain || undefined);

      res.set({
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      });

      res.send(sitemap);
    } catch (error) {
      console.error("[SEO] Error generating sitemap:", error);
      res.status(200).set("Content-Type", "application/xml").send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
      );
    }
  }

  /**
   * Extract subdomain from host
   */
  private extractSubdomain(host: string): string | null {
    // Remove port if exists
    const hostname = host.split(":")[0];

    // Check if it's a subdomain (not main domain)
    const parts = hostname.split(".");

    // If localhost or IP, no subdomain
    if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }

    // If has subdomain (more than 2 parts and not www)
    if (parts.length > 2 && parts[0] !== "www") {
      return parts[0];
    }

    return null;
  }
}
