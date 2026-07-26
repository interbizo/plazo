import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateServiceDto, UpdateServiceDto } from "./services.dto";
import {
  CreateServicePackageDto,
  UpdateServicePackageDto,
  BulkCreatePackagesDto,
} from "./service-packages.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { StringHelper } from "@common/utils/string.helper";

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);
  
  constructor(private prisma: PrismaService) {}

  // Reusable category select with parent
  private readonly categorySelect = {
    id: true,
    name: true,
    slug: true,
    parentId: true,
    parent: {
      select: {
        id: true,
        name: true,
        slug: true,
      }
    }
  };

  private async verifyTenantOwnership(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ownerId: true },
    });
    if (!tenant || tenant.ownerId !== userId) {
      throw new ForbiddenException("You do not own this tenant/store");
    }
  }

  async createService(
    tenantId: string,
    createServiceDto: CreateServiceDto,
    userId?: string,
  ) {
    // Verify tenant ownership
    if (userId) {
      await this.verifyTenantOwnership(tenantId, userId);
    }

    // Check subscription limit
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    if (tenant.usedPosts >= tenant.postsLimit) {
      throw new BadRequestException(
        `Posting limit reached (${tenant.postsLimit}). Please upgrade your subscription plan.`,
      );
    }

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    const publishToMarketplace = createServiceDto.publishToMarketplace ?? true;

    const slug = await this.generateUniqueSlug(
      tenantId,
      createServiceDto.slug || createServiceDto.name,
    );

    const { publishToMarketplace: _ignored, ...restDto } = createServiceDto;

    // Auto-inherit city from tenant if not provided
    if (!createServiceDto.city && tenant.city) {
      restDto.city = tenant.city;
      restDto.latitude = tenant.latitude ?? undefined;
      restDto.longitude = tenant.longitude ?? undefined;
    }

    const service = await this.prisma.service.create({
      data: {
        tenantId,
        ...restDto,
        slug,
        isPublished: createServiceDto.isPublished ?? true,
        publishToMarketplace,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parentId: true,
            parent: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        },
      },
    });

    // Update used posts count
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { usedPosts: { increment: 1 } },
    });

    return service;
  }

  async getServices(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
    categoryId?: string,
    search?: string,
    city?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      tenantId,
      isPublished: true,
      deletedAt: null,
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { tags: { hasSome: [search] } },
        ],
      }),
      ...(city && { city: { contains: city, mode: "insensitive" as const } }),
    };

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take,
        include: { category: { select: this.categorySelect } },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.service.count({ where }),
    ]);

    return PaginationHelper.formatResponse(services, total, page, limit);
  }

  async getServiceById(id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, deletedAt: null },
      include: { 
        category: { select: this.categorySelect }, 
        packages: { orderBy: { tier: "asc" } } 
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return service;
  }

  async updateService(
    id: string,
    userId: string,
    updateServiceDto: UpdateServiceDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    await this.verifyTenantOwnership(service.tenantId, userId);

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    // No restriction on publishToMarketplace

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: { category: { select: this.categorySelect } },
    });
  }

  async deleteService(id: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      select: { tenantId: true },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    await this.verifyTenantOwnership(service.tenantId, userId);

    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // BUG-54: Decrement tenant's usedPosts
    await this.prisma.tenant.update({
      where: { id: service.tenantId },
      data: { usedPosts: { decrement: 1 } },
    });

    return { message: "Service deleted successfully" };
  }

  async boostService(id: string, userId: string, days: number = 7) {
    const service = await this.prisma.service.findUnique({ 
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            subscriptionPlan: true,
          },
        },
      },
    });
    
    if (!service) throw new NotFoundException("Service not found");
    if (!service.tenant) throw new NotFoundException("Tenant not found for this service");

    await this.verifyTenantOwnership(service.tenantId, userId);

    // Get subscription plan features
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: service.tenant.subscriptionPlan },
      select: { canBoostListing: true },
    });

    // Boost listing HANYA untuk paket yang memiliki fitur ini
    if (!planConfig?.canBoostListing) {
      throw new ForbiddenException(
        "Fitur Boost Listing tidak tersedia di paket langganan Anda saat ini. Silakan upgrade ke paket yang memiliki fitur Boost untuk menggunakan fitur ini.",
      );
    }

    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + days);

    // Boost GRATIS untuk semua user yang berlangganan
    const updated = await this.prisma.service.update({
      where: { id },
      data: { isBoosted: true, boostedUntil },
    });

    this.logger.log(`Service ${id} boosted successfully (${service.tenant.subscriptionPlan} plan) for ${days} days`);

    return {
      message: `Service berhasil di-boost untuk ${days} hari`,
      service: updated,
      boostUntil: boostedUntil,
      plan: service.tenant.subscriptionPlan,
    };
  }

  async getTenantServices(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where: {
          tenantId,
          deletedAt: null,
        },
        skip,
        take,
        include: { category: { select: this.categorySelect } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.service.count({
        where: { tenantId, deletedAt: null },
      }),
    ]);

    return PaginationHelper.formatResponse(services, total, page, limit);
  }

  // ============ SERVICE PACKAGES ============

  async createPackage(
    serviceId: string,
    userId: string,
    dto: CreateServicePackageDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { tenantId: true },
    });
    if (!service) throw new NotFoundException("Service not found");
    await this.verifyTenantOwnership(service.tenantId, userId);

    const existing = await this.prisma.servicePackage.findUnique({
      where: { serviceId_tier: { serviceId, tier: dto.tier } },
    });
    if (existing) {
      throw new BadRequestException(
        `Package tier ${dto.tier} already exists for this service`,
      );
    }

    return this.prisma.servicePackage.create({
      data: { serviceId, ...dto },
    });
  }

  async bulkCreatePackages(
    serviceId: string,
    userId: string,
    dto: BulkCreatePackagesDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { tenantId: true },
    });
    if (!service) throw new NotFoundException("Service not found");
    await this.verifyTenantOwnership(service.tenantId, userId);

    // Delete existing packages and recreate
    await this.prisma.servicePackage.deleteMany({ where: { serviceId } });

    const packages = await Promise.all(
      dto.packages.map((pkg) =>
        this.prisma.servicePackage.create({
          data: { serviceId, ...pkg },
        }),
      ),
    );

    return { message: "Packages created", packages };
  }

  async updatePackage(
    serviceId: string,
    packageId: string,
    userId: string,
    dto: UpdateServicePackageDto,
  ) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { tenantId: true },
    });
    if (!service) throw new NotFoundException("Service not found");
    await this.verifyTenantOwnership(service.tenantId, userId);

    return this.prisma.servicePackage.update({
      where: { id: packageId },
      data: dto,
    });
  }

  async deletePackage(serviceId: string, packageId: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { tenantId: true },
    });
    if (!service) throw new NotFoundException("Service not found");
    await this.verifyTenantOwnership(service.tenantId, userId);

    await this.prisma.servicePackage.delete({ where: { id: packageId } });
    return { message: "Package deleted" };
  }

  async getPackages(serviceId: string) {
    return this.prisma.servicePackage.findMany({
      where: { serviceId },
      orderBy: { tier: "asc" },
    });
  }

  /**
   * Get service by slug (SEO-friendly lookup)
   */
  async getServiceBySlug(tenantId: string, slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { tenantId, slug, deletedAt: null },
      include: {
        category: true,
        packages: { orderBy: { tier: "asc" } },
        tenant: { select: { id: true, name: true, subdomain: true } },
      },
    });

    if (!service) {
      throw new NotFoundException("Service not found");
    }

    return {
      service,
      seo: {
        title: service.metaTitle || service.name,
        description:
          service.metaDescription || service.description.substring(0, 160),
        keywords: service.tags.join(", "),
        ogImage: service.thumbnail,
        canonicalUrl: `/${service.tenant.subdomain}/services/${service.slug}`,
      },
    };
  }

  /**
   * Toggle marketplace visibility for a service
   */
  async toggleMarketplaceVisibility(
    tenantId: string,
    userId: string,
    serviceId: string,
    publish: boolean,
  ) {
    await this.verifyTenantOwnership(tenantId, userId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    // Seller FREE dan Member sama-sama bisa publish ke marketplace
    // Tidak ada pembatasan berdasarkan tier

    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId, deletedAt: null },
    });
    if (!service) throw new NotFoundException("Service not found");

    await this.prisma.service.update({
      where: { id: serviceId },
      data: { publishToMarketplace: publish },
    });

    return {
      message: publish
        ? "Service dipublish ke marketplace utama"
        : "Service dihapus dari marketplace utama",
    };
  }

  /**
   * Generate unique slug within tenant scope
   */
  private async generateUniqueSlug(
    tenantId: string,
    text: string,
  ): Promise<string> {
    let slug = StringHelper.slugify(text);
    let suffix = 0;
    let candidate = slug;

    while (true) {
      const existing = await this.prisma.service.findFirst({
        where: { tenantId, slug: candidate, deletedAt: null },
      });
      if (!existing) return candidate;
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
  }
}
