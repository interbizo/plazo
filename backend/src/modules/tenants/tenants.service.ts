import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateTenantDto, UpdateTenantDto, UpdateTenantSeoDto, UpdateTenantThemeDto } from "./tenants.dto";

@Injectable()
export class TenantsService {
  private readonly RESERVED_SUBDOMAINS = [
    "www",
    "api",
    "admin",
    "app",
    "mail",
    "smtp",
    "ftp",
    "dashboard",
    "panel",
    "support",
    "help",
    "billing",
    "auth",
    "login",
    "register",
    "static",
    "assets",
    "cdn",
    "media",
    "upload",
    "uploads",
    "public",
  ];

  constructor(private prisma: PrismaService) {}

  private validateSubdomain(subdomain: string) {
    const cleaned = subdomain.toLowerCase().trim();

    if (cleaned.length < 3 || cleaned.length > 30) {
      throw new ForbiddenException("Subdomain must be 3-30 characters");
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(cleaned)) {
      throw new ForbiddenException(
        "Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)",
      );
    }

    if (this.RESERVED_SUBDOMAINS.includes(cleaned)) {
      throw new ForbiddenException(`"${cleaned}" is a reserved subdomain`);
    }

    return cleaned;
  }

  async createTenant(userId: string, createTenantDto: CreateTenantDto) {
    try {
      console.log(`[Tenant] Creating tenant for user: ${userId}`);
      console.log(`[Tenant] Subdomain requested: ${createTenantDto.subdomain}`);
      
      const subdomain = this.validateSubdomain(createTenantDto.subdomain);

      // Check uniqueness before DB constraint
      const existing = await this.prisma.tenant.findUnique({
        where: { subdomain },
      });
      
      if (existing) {
        console.error(`[Tenant] Subdomain already taken: ${subdomain}`);
        throw new BadRequestException(
          `Subdomain "${subdomain}" is already taken. Please choose another.`,
        );
      }

      // Check if user already has a tenant
      const userTenants = await this.prisma.tenant.findMany({
        where: { ownerId: userId },
      });

      if (userTenants.length > 0) {
        console.error(`[Tenant] User already has ${userTenants.length} tenant(s)`);
        throw new BadRequestException(
          "You already have a store. Each user can only create one store.",
        );
      }

      const tenant = await this.prisma.tenant.create({
        data: {
          ...createTenantDto,
          subdomain,
          ownerId: userId,
        },
      });

      console.log(`[Tenant] Successfully created tenant: ${tenant.id}`);
      return tenant;
    } catch (error) {
      console.error('[Tenant] Error creating tenant:', error);
      throw error;
    }
  }

  async getTenantBySubdomain(subdomain: string) {
    return this.prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async getTenantById(id: string, userId?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        owner: true,
        members: {
          select: {
            id: true,
            email: true,
            firstName: true,
            role: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // If userId provided, validate access
    if (userId) {
      const isOwner = tenant.ownerId === userId;
      const isMember = tenant.members.some(member => member.id === userId);
      
      if (!isOwner && !isMember) {
        throw new ForbiddenException('You do not have access to this tenant');
      }
    }

    return tenant;
  }

  async getUserTenants(userId: string) {
    return this.prisma.tenant.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { id: userId } } }],
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async updateTenant(
    id: string,
    userId: string,
    updateTenantDto: UpdateTenantDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    if (tenant.ownerId !== userId) {
      throw new ForbiddenException("You do not own this tenant/store");
    }

    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async getTenantStats(tenantId: string, userId?: string) {
    // Validate access if userId provided
    if (userId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          ownerId: true,
          members: {
            where: { id: userId },
            select: { id: true },
          },
        },
      });

      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }

      const isOwner = tenant.ownerId === userId;
      const isMember = tenant.members.length > 0;

      if (!isOwner && !isMember) {
        throw new ForbiddenException('You do not have access to this tenant stats');
      }
    }

    const [productCount, serviceCount, orderCount, totalRevenue] =
      await Promise.all([
        this.prisma.product.count({ where: { tenantId } }),
        this.prisma.service.count({ where: { tenantId } }),
        this.prisma.order.count({ where: { tenantId } }),
        this.prisma.order.aggregate({
          where: { tenantId },
          _sum: { amount: true },
        }),
      ]);

    return {
      productCount,
      serviceCount,
      orderCount,
      totalRevenue: totalRevenue._sum.amount || 0,
    };
  }

  /**
   * Update SEO Active status for a tenant (Admin only)
   * Only verified tenants can have SEO enabled
   */
  async updateTenantSeo(tenantId: string, updateSeoDto: UpdateTenantSeoDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        subdomain: true,
        isVerified: true,
        isSeoActive: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant is verified before enabling SEO
    if (updateSeoDto.isSeoActive && !tenant.isVerified) {
      throw new BadRequestException(
        'Cannot enable SEO for unverified tenant. Please verify the tenant first.',
      );
    }

    const now = new Date();
    const updateData: any = {
      isSeoActive: updateSeoDto.isSeoActive,
    };

    // Track activation/deactivation timestamps
    if (updateSeoDto.isSeoActive && !tenant.isSeoActive) {
      // Activating SEO
      updateData.seoActivatedAt = now;
    } else if (!updateSeoDto.isSeoActive && tenant.isSeoActive) {
      // Deactivating SEO
      updateData.seoDeactivatedAt = now;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true,
        subdomain: true,
        name: true,
        isVerified: true,
        isSeoActive: true,
        seoActivatedAt: true,
        seoDeactivatedAt: true,
      },
    });

    console.log(
      `[Tenant SEO] ${updateSeoDto.isSeoActive ? 'Enabled' : 'Disabled'} SEO for tenant: ${tenant.subdomain}`,
    );

    return {
      success: true,
      message: `SEO ${updateSeoDto.isSeoActive ? 'enabled' : 'disabled'} successfully`,
      data: updatedTenant,
    };
  }

  /**
   * Update theme settings for a tenant (Seller only)
   */
  async updateTenantTheme(
    tenantId: string,
    userId: string,
    updateThemeDto: UpdateTenantThemeDto,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        ownerId: true,
        subdomain: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.ownerId !== userId) {
      throw new ForbiddenException('You do not own this tenant/store');
    }

    // Validate hex color format if provided
    if (updateThemeDto.themeColor && !/^#[0-9A-F]{6}$/i.test(updateThemeDto.themeColor)) {
      throw new BadRequestException('Invalid primary color format. Use hex format (e.g., #3B82F6)');
    }

    if (updateThemeDto.themeSecondary && !/^#[0-9A-F]{6}$/i.test(updateThemeDto.themeSecondary)) {
      throw new BadRequestException('Invalid secondary color format. Use hex format (e.g., #10B981)');
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateThemeDto,
      select: {
        id: true,
        subdomain: true,
        name: true,
        themeColor: true,
        themeSecondary: true,
        themePreset: true,
        themeFontFamily: true,
        themeBorderRadius: true,
        themeShadowStyle: true,
      },
    });

    console.log(`[Tenant Theme] Updated theme for tenant: ${tenant.subdomain}`);

    return {
      success: true,
      message: 'Theme updated successfully',
      data: updatedTenant,
    };
  }
}
