import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CreateTenantDto, UpdateTenantDto, UpdateTenantSeoDto, UpdateTenantThemeDto } from "./tenants.dto";
import { MeilisearchService } from "@modules/search/meilisearch.service";
import { UserRole } from "@prisma/client";

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

  constructor(
    private prisma: PrismaService,
    private meilisearch: MeilisearchService,
  ) {}

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
    const subdomain = this.validateSubdomain(createTenantDto.subdomain);
    const referralCode = createTenantDto.referralCode?.trim().toUpperCase();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          throw new BadRequestException("User not found or inactive");
        }

        const [existingSubdomain, existingStore] = await Promise.all([
          tx.tenant.findUnique({ where: { subdomain } }),
          tx.tenant.findFirst({ where: { ownerId: userId } }),
        ]);
        if (existingSubdomain) {
          throw new ConflictException("Subdomain already taken");
        }
        if (existingStore) {
          throw new BadRequestException("You already have a store");
        }

        const affiliateProfile = referralCode
          ? await tx.affiliateProfile.findUnique({
              where: { referralCode },
              select: { userId: true, referralCode: true, isActive: true },
            })
          : null;

        if (referralCode && (!affiliateProfile || !affiliateProfile.isActive)) {
          throw new BadRequestException("Kode referral tidak valid atau tidak aktif.");
        }
        if (affiliateProfile?.userId === userId) {
          throw new BadRequestException("Anda tidak dapat menggunakan kode referral sendiri.");
        }

        const tenant = await tx.tenant.create({
          data: {
            subdomain,
            name: createTenantDto.name.trim(),
            city: createTenantDto.city.trim(),
            province: createTenantDto.province.trim(),
            address: createTenantDto.address.trim(),
            postalCode: createTenantDto.postalCode.trim(),
            shippingOriginId: createTenantDto.shippingOriginId,
            shippingOriginLabel: createTenantDto.shippingOriginLabel.trim(),
            description: createTenantDto.description?.trim() || null,
            contactEmail: createTenantDto.contactEmail,
            contactPhone: createTenantDto.contactPhone,
            ownerId: userId,
            referralCodeUsed: affiliateProfile?.referralCode,
            referredBy: affiliateProfile?.userId,
          },
        });

        const updatedUser = user.role === UserRole.BUYER
          ? await tx.user.update({
              where: { id: userId },
              data: { role: UserRole.SELLER },
              select: { id: true, email: true, firstName: true, lastName: true, role: true },
            })
          : user;

        await tx.sellerProfile.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });

        return { tenant, user: updatedUser };
      });

      void this.meilisearch.syncSeller(result.tenant.id).catch(() => {});
      return {
        message: "Toko berhasil dibuat",
        tenant: result.tenant,
        user: { ...result.user, tenantSubdomain: result.tenant.subdomain },
      };
    } catch (error: any) {
      if (error?.code === "P2002") {
        throw new ConflictException("Subdomain already taken");
      }
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

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });

    // Sync ke Meilisearch (fire-and-forget)
    void this.meilisearch.syncSeller(updatedTenant.id).catch(() => {});

    return updatedTenant;
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
