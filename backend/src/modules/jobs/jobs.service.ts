import { Injectable, BadRequestException, ForbiddenException, Logger } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateJobDto, UpdateJobDto } from "./jobs.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { StringHelper } from "@common/utils/string.helper";
import { JobStatus } from "@prisma/client";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  
  constructor(
    private prisma: PrismaService,
    private notificationEvents: NotificationEventsService,
  ) {}

  /**
   * Create Job (Buyer only)
   */
  async createJob(
    tenantId: string | undefined,
    buyerId: string,
    createJobDto: CreateJobDto,
  ) {
    // Check KYC verification — buyer must be KYC approved to post jobs
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { kycStatus: true },
    });

    if (!buyer || buyer.kycStatus !== "APPROVED") {
      throw new ForbiddenException(
        "Anda harus menyelesaikan verifikasi KYC terlebih dahulu sebelum dapat memposting lowongan pekerjaan.",
      );
    }

    // If no tenant provided (buyer without tenant), use default tenant
    let resolvedTenantId = tenantId;
    
    if (!resolvedTenantId) {
      // Find default tenant for jobs
      const defaultTenant = await this.prisma.tenant.findFirst({
        where: { subdomain: "default" },
      });
      
      if (!defaultTenant) {
        // Create default tenant if it doesn't exist
        // First, find or create a system user to own the default tenant
        let systemUser = await this.prisma.user.findFirst({
          where: { email: "system@plazo.com" },
        });
        
        if (!systemUser) {
          systemUser = await this.prisma.user.create({
            data: {
              email: "system@plazo.com",
              firstName: "System",
              lastName: "Admin",
              role: "ADMIN",
              password: "system-generated-password", // This should be hashed in production
            },
          });
        }
        
        const newDefaultTenant = await this.prisma.tenant.create({
          data: {
            subdomain: "default",
            name: "Default Marketplace",
            isActive: true,
            subscriptionPlan: "FREE",
            ownerId: systemUser.id,
          },
        });
        resolvedTenantId = newDefaultTenant.id;
      } else {
        resolvedTenantId = defaultTenant.id;
      }
    }

    // Fetch tenant for auto-inheriting city
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
    });

    // Auto-inherit city from tenant if not provided
    const city = createJobDto.city || tenant?.city || undefined;
    const latitude = createJobDto.city ? createJobDto.latitude : (tenant?.city ? tenant.latitude : undefined);
    const longitude = createJobDto.city ? createJobDto.longitude : (tenant?.city ? tenant.longitude : undefined);

    const slug = await this.generateUniqueSlug(
      resolvedTenantId,
      createJobDto.slug || createJobDto.title,
    );
    const job = await this.prisma.job.create({
      data: {
        tenantId: resolvedTenantId,
        buyerId,
        title: createJobDto.title,
        slug,
        description: createJobDto.description,
        budget: createJobDto.budget,
        categoryId: createJobDto.categoryId,
        tags: createJobDto.tags || [],
        maxProposals: createJobDto.maxProposals,
        city,
        latitude,
        longitude,
        metaTitle: createJobDto.metaTitle,
        metaDescription: createJobDto.metaDescription,
        status: JobStatus.OPEN,
      },
    });

    // Notify relevant sellers
    this.notificationEvents.onNewJobPosted({
      tenantId: resolvedTenantId,
      jobTitle: job.title,
      jobId: job.id,
      budget: job.budget,
      tags: createJobDto.tags,
      categoryId: createJobDto.categoryId,
    });

    return {
      message: "Job posted successfully",
      job,
    };
  }

  /**
   * Get Jobs with Pagination & Filter
   */
  async getJobs(
    tenantId: string | undefined,
    page: number = 1,
    limit: number = 10,
    status?: JobStatus,
    search?: string,
    city?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {
      ...(tenantId && { tenantId }), // Only filter by tenant if provided
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { tags: { hasSome: [search] } },
        ],
      }),
      ...(city && { city: { contains: city, mode: "insensitive" as const } }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        skip,
        take,
        include: {
          buyer: {
            select: { id: true, firstName: true, lastName: true, avatar: true },
          },
          _count: {
            select: { proposals: true },
          },
        },
        orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.job.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(jobs, total, page, limit);
  }

  /**
   * Get Single Job
   */
  async getJob(tenantId: string | undefined, jobId: string) {
    const where: any = {
      id: jobId,
      deletedAt: null,
    };
    
    // Only filter by tenant if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const job = await this.prisma.job.findFirst({
      where,
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        _count: {
          select: { proposals: true },
        },
      },
    });

    if (!job) {
      throw new BadRequestException("Job not found");
    }

    return { job };
  }

  /**
   * Update Job (Buyer only)
   */
  async updateJob(
    tenantId: string | undefined,
    jobId: string,
    buyerId: string,
    updateJobDto: UpdateJobDto,
  ) {
    const where: any = {
      id: jobId,
      buyerId,
      deletedAt: null,
    };
    
    // Only filter by tenant if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const job = await this.prisma.job.findFirst({ where });

    if (!job) {
      throw new BadRequestException("Job not found or you are not the owner");
    }

    // Can't update if hired
    if (job.status !== JobStatus.OPEN && job.status !== JobStatus.IN_REVIEW) {
      throw new BadRequestException("Cannot update job in current status");
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        ...updateJobDto,
        maxProposals: updateJobDto.maxProposals,
      },
    });

    return {
      message: "Job updated successfully",
      job: updated,
    };
  }

  /**
   * Delete Job (Buyer only, soft delete)
   */
  async deleteJob(tenantId: string | undefined, jobId: string, buyerId: string) {
    const where: any = {
      id: jobId,
      buyerId,
      deletedAt: null,
    };
    
    // Only filter by tenant if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const job = await this.prisma.job.findFirst({ where });

    if (!job) {
      throw new BadRequestException("Job not found or you are not the owner");
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });

    return { message: "Job deleted successfully" };
  }

  /**
   * Boost Job
   */
  async boostJob(
    tenantId: string | undefined,
    jobId: string,
    buyerId: string,
    daysToBoost: number = 7,
  ) {
    const where: any = {
      id: jobId,
      buyerId,
      deletedAt: null,
    };
    
    // Only filter by tenant if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const job = await this.prisma.job.findFirst({ 
      where,
      include: {
        tenant: {
          select: {
            id: true,
            subscriptionPlan: true,
          },
        },
      },
    });

    if (!job) {
      throw new BadRequestException("Job not found or you are not the owner");
    }

    if (!job.tenant) {
      throw new BadRequestException("Tenant not found for this job");
    }

    // Get subscription plan features
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: job.tenant.subscriptionPlan },
      select: { canBoostListing: true },
    });

    // Boost listing HANYA untuk user yang sudah berlangganan
    if (!planConfig?.canBoostListing) {
      throw new ForbiddenException(
        "Fitur Boost Listing hanya tersedia untuk paket Premium dan Business. Silakan upgrade paket Anda untuk menggunakan fitur ini.",
      );
    }

    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + daysToBoost);

    // Boost GRATIS untuk semua user yang berlangganan
    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { isBoosted: true, boostedUntil },
    });

    this.logger.log(`Job ${jobId} boosted successfully (${job.tenant.subscriptionPlan} plan) for ${daysToBoost} days`);

    return {
      message: `Job berhasil di-boost untuk ${daysToBoost} hari`,
      job: updated,
      boostUntil: boostedUntil,
      plan: job.tenant.subscriptionPlan,
    };
  }

  /**
   * Get job by slug (SEO-friendly lookup)
   */
  async getJobBySlug(tenantId: string | undefined, slug: string) {
    const where: any = {
      slug,
      deletedAt: null,
    };
    
    // Only filter by tenant if provided
    if (tenantId) {
      where.tenantId = tenantId;
    }
    
    const job = await this.prisma.job.findFirst({
      where,
      include: {
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        tenant: { select: { id: true, name: true, subdomain: true } },
        _count: { select: { proposals: true } },
      },
    });

    if (!job) {
      throw new BadRequestException("Job not found");
    }

    return {
      job,
      seo: {
        title: job.metaTitle || job.title,
        description: job.metaDescription || job.description.substring(0, 160),
        keywords: job.tags.join(", "),
        canonicalUrl: `/${job.tenant.subdomain}/jobs/${job.slug}`,
      },
      structuredData: {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.description.substring(0, 500),
        datePosted: job.createdAt,
        hiringOrganization: { "@type": "Organization", name: job.tenant.name },
        baseSalary: job.budget
          ? {
              "@type": "MonetaryAmount",
              currency: "USD",
              value: job.budget,
            }
          : undefined,
      },
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
      const existing = await this.prisma.job.findFirst({
        where: { tenantId, slug: candidate, deletedAt: null },
      });
      if (!existing) return candidate;
      suffix++;
      candidate = `${slug}-${suffix}`;
    }
  }
}
