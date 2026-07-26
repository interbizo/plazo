import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '@modules/database/prisma.service';

@Controller()
export class SitemapController {
  private readonly frontendUrl: string;

  constructor(private prisma: PrismaService) {
    this.frontendUrl = process.env.FRONTEND_URL || 'https://plazo.com';
  }

  /**
   * Main sitemap index
   * URL: https://plazo.id/sitemap.xml
   */
  @Get('sitemap.xml')
  async sitemapIndex(@Res() res: Response) {
    const totalTenants = await this.prisma.tenant.count({
      where: { isActive: true, deletedAt: null },
    });

    const sitemapCount = Math.ceil(totalTenants / 5000);
    const now = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // Add main pages sitemap
    xml += '<sitemap>';
    xml += `<loc>${process.env.APP_URL}/sitemap-pages.xml</loc>`;
    xml += `<lastmod>${now}</lastmod>`;
    xml += '</sitemap>';

    // Add tenant sitemaps (chunked by 5000)
    for (let i = 1; i <= sitemapCount; i++) {
      xml += '<sitemap>';
      xml += `<loc>${process.env.APP_URL}/sitemap-tenants-${i}.xml</loc>`;
      xml += `<lastmod>${now}</lastmod>`;
      xml += '</sitemap>';
    }

    xml += '</sitemapindex>';

    res.header('Content-Type', 'text/xml');
    res.send(xml);
  }

  /**
   * Main pages sitemap (homepage, categories, etc)
   * URL: https://plazo.id/sitemap-pages.xml
   */
  @Get('sitemap-pages.xml')
  async sitemapPages(@Res() res: Response) {
    const baseUrl = process.env.APP_URL;
    const now = new Date().toISOString();

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    // Homepage
    xml += '<url>';
    xml += `<loc>${baseUrl}/</loc>`;
    xml += `<lastmod>${now}</lastmod>`;
    xml += '<changefreq>daily</changefreq>';
    xml += '<priority>1.0</priority>';
    xml += '</url>';

    // Categories
    const categories = await this.prisma.category.findMany({
      select: { slug: true, updatedAt: true },
    });

    for (const cat of categories) {
      xml += '<url>';
      xml += `<loc>${baseUrl}/kategori/${cat.slug}</loc>`;
      xml += `<lastmod>${cat.updatedAt.toISOString()}</lastmod>`;
      xml += '<changefreq>weekly</changefreq>';
      xml += '<priority>0.9</priority>';
      xml += '</url>';
    }

    xml += '</urlset>';

    res.header('Content-Type', 'text/xml');
    res.send(xml);
  }

  /**
   * Tenants sitemap (chunked)
   * URL: https://plazo.id/sitemap-tenants-1.xml
   */
  @Get('sitemap-tenants-:page.xml')
  async sitemapTenants(@Param('page') page: string, @Res() res: Response) {
    const pageNum = parseInt(page, 10);
    const skip = (pageNum - 1) * 5000;

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, deletedAt: null },
      select: { subdomain: true, updatedAt: true },
      skip,
      take: 5000,
      orderBy: { createdAt: 'desc' },
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const baseDomain = process.env.BASE_DOMAIN || 'plazo.id';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    for (const tenant of tenants) {
      xml += '<url>';
      if (isProduction) {
        xml += `<loc>https://${tenant.subdomain}.${baseDomain}/</loc>`;
      } else {
        xml += `<loc>${this.frontendUrl}/store/${tenant.subdomain}</loc>`;
      }
      xml += `<lastmod>${tenant.updatedAt.toISOString()}</lastmod>`;
      xml += '<changefreq>weekly</changefreq>';
      xml += '<priority>0.8</priority>';
      xml += '</url>';
    }

    xml += '</urlset>';

    res.header('Content-Type', 'text/xml');
    res.send(xml);
  }

  /**
   * Individual subdomain sitemap
   * URL: https://tokobudi.plazo.id/sitemap.xml
   */
  @Get('subdomain-sitemap.xml')
  async subdomainSitemap(@Res() res: Response) {
    // This will be called from subdomain middleware
    // For now, return simple sitemap
    const subdomain = res.locals.subdomain;
    
    if (!subdomain) {
      return res.status(404).send('Not found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      select: { subdomain: true, updatedAt: true },
    });

    if (!tenant) {
      return res.status(404).send('Not found');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const baseDomain = process.env.BASE_DOMAIN || 'plazo.id';

    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    xml += '<url>';
    if (isProduction) {
      xml += `<loc>https://${tenant.subdomain}.${baseDomain}/</loc>`;
    } else {
      xml += `<loc>${this.frontendUrl}/store/${tenant.subdomain}</loc>`;
    }
    xml += `<lastmod>${tenant.updatedAt.toISOString()}</lastmod>`;
    xml += '<changefreq>weekly</changefreq>';
    xml += '<priority>1.0</priority>';
    xml += '</url>';
    xml += '</urlset>';

    res.header('Content-Type', 'text/xml');
    res.send(xml);
  }
}
