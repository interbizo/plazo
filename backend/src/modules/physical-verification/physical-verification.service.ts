import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import {
  RequestPhysicalVerificationDto,
  ScheduleVisitDto,
  UploadVisitPhotosDto,
  ApproveVerificationDto,
  RejectVerificationDto,
  UploadCertificateDto,
  PhysicalVerificationStatus,
} from "./physical-verification.dto";
import { PaginationHelper } from "../../common/utils/pagination.helper";

@Injectable()
export class PhysicalVerificationService {
  constructor(private prisma: PrismaService) {}

  // ============ SELLER ENDPOINTS ============

  /**
   * Check if seller is eligible to request physical verification
   */
  async checkEligibility(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
      include: { subscription: true },
    });

    if (!tenant) {
      throw new NotFoundException("Toko tidak ditemukan");
    }

    // Get plan config to check eligibility
    const planConfig = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { plan: tenant.subscriptionPlan },
    });

    if (!planConfig) {
      return {
        eligible: false,
        reason: "Paket langganan tidak ditemukan",
        currentPlan: tenant.subscriptionPlan,
      };
    }

    // Check if plan allows physical verification
    if (!planConfig.canRequestPhysicalVerification) {
      return {
        eligible: false,
        reason: "Paket Anda belum mendukung verifikasi fisik. Upgrade ke paket yang lebih tinggi.",
        currentPlan: tenant.subscriptionPlan,
        planName: planConfig.name,
      };
    }

    // Check if already has verification
    const existingVerification = await this.prisma.physicalVerification.findUnique({
      where: { tenantId: tenant.id },
    });

    if (existingVerification) {
      if (existingVerification.status === PhysicalVerificationStatus.APPROVED) {
        return {
          eligible: false,
          reason: "Toko Anda sudah terverifikasi",
          status: existingVerification.status,
        };
      }

      if (
        existingVerification.status === PhysicalVerificationStatus.PENDING ||
        existingVerification.status === PhysicalVerificationStatus.SCHEDULED ||
        existingVerification.status === PhysicalVerificationStatus.IN_PROGRESS
      ) {
        return {
          eligible: false,
          reason: "Anda sudah memiliki pengajuan verifikasi yang sedang diproses",
          status: existingVerification.status,
        };
      }
    }

    return {
      eligible: true,
      currentPlan: tenant.subscriptionPlan,
      planName: planConfig.name,
    };
  }

  /**
   * Get verification status for seller
   */
  async getVerificationStatus(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("Toko tidak ditemukan");
    }

    const verification = await this.prisma.physicalVerification.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!verification) {
      return {
        status: PhysicalVerificationStatus.NOT_REQUESTED,
        message: "Belum pernah mengajukan verifikasi fisik",
      };
    }

    return {
      verification,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        isVerified: tenant.isVerified,
      },
    };
  }

  /**
   * Request physical verification
   */
  async requestVerification(userId: string, dto: RequestPhysicalVerificationDto, ipAddress?: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("Toko tidak ditemukan");
    }

    // Check eligibility
    const eligibility = await this.checkEligibility(userId);
    if (!eligibility.eligible) {
      throw new BadRequestException(eligibility.reason);
    }

    // Create verification request
    const verification = await this.prisma.physicalVerification.create({
      data: {
        tenantId: tenant.id,
        requestedBy: userId,
        businessName: dto.businessName,
        businessAddress: dto.businessAddress,
        businessCity: dto.businessCity,
        businessPhone: dto.businessPhone,
        requestNotes: dto.requestNotes,
        status: PhysicalVerificationStatus.PENDING,
        ipAddress,
      },
    });

    // Create notification for admins
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    });

    await Promise.all(
      admins.map((admin) =>
        this.prisma.notification.create({
          data: {
            userId: admin.id,
            tenantId: tenant.id,
            type: "PHYSICAL_VERIFICATION_REQUEST",
            title: "Pengajuan Verifikasi Fisik Baru",
            message: `${tenant.name} mengajukan verifikasi fisik untuk toko mereka`,
            metadata: {
              verificationId: verification.id,
              tenantId: tenant.id,
              businessName: dto.businessName,
            },
          },
        }),
      ),
    );

    return {
      message: "Pengajuan verifikasi fisik berhasil dikirim. Tim kami akan menghubungi Anda untuk jadwal kunjungan.",
      verification,
    };
  }

  /**
   * Download certificate (if approved)
   */
  async getCertificate(userId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException("Toko tidak ditemukan");
    }

    const verification = await this.prisma.physicalVerification.findUnique({
      where: { tenantId: tenant.id },
    });

    if (!verification) {
      throw new NotFoundException("Belum ada pengajuan verifikasi");
    }

    if (verification.status !== PhysicalVerificationStatus.APPROVED) {
      throw new BadRequestException("Verifikasi belum disetujui");
    }

    if (!verification.certificateUrl) {
      throw new NotFoundException("Sertifikat belum tersedia");
    }

    return {
      certificateUrl: verification.certificateUrl,
      approvedAt: verification.approvedAt,
    };
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * List all verification requests
   */
  async getAllVerifications(params: {
    page?: number;
    limit?: number;
    status?: PhysicalVerificationStatus;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, search } = params;
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" as const } },
        { businessCity: { contains: search, mode: "insensitive" as const } },
        { tenant: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const [verifications, total] = await Promise.all([
      this.prisma.physicalVerification.findMany({
        where,
        skip,
        take,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              subdomain: true,
              city: true,
              subscriptionPlan: true,
              isVerified: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      }),
      this.prisma.physicalVerification.count({ where }),
    ]);

    return PaginationHelper.formatResponse(verifications, total, page, limit);
  }

  /**
   * Get verification detail
   */
  async getVerificationById(id: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    return { verification };
  }

  /**
   * Schedule visit
   */
  async scheduleVisit(id: string, dto: ScheduleVisitDto, adminId: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    if (verification.status === PhysicalVerificationStatus.APPROVED) {
      throw new BadRequestException("Verifikasi sudah disetujui");
    }

    if (verification.status === PhysicalVerificationStatus.REJECTED) {
      throw new BadRequestException("Verifikasi sudah ditolak");
    }

    const updated = await this.prisma.physicalVerification.update({
      where: { id },
      data: {
        scheduledDate: new Date(dto.scheduledDate),
        status: PhysicalVerificationStatus.SCHEDULED,
        verificationNotes: dto.notes,
      },
    });

    // Notify seller
    await this.prisma.notification.create({
      data: {
        userId: verification.tenant.ownerId,
        tenantId: verification.tenantId,
        type: "PHYSICAL_VERIFICATION_SCHEDULED",
        title: "Kunjungan Verifikasi Dijadwalkan",
        message: `Kunjungan verifikasi fisik untuk toko Anda dijadwalkan pada ${new Date(dto.scheduledDate).toLocaleDateString("id-ID")}`,
        metadata: {
          verificationId: id,
          scheduledDate: dto.scheduledDate,
        },
      },
    });

    return {
      message: "Jadwal kunjungan berhasil ditentukan",
      verification: updated,
    };
  }

  /**
   * Upload visit photos
   */
  async uploadVisitPhotos(id: string, dto: UploadVisitPhotosDto, adminId: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    const updated = await this.prisma.physicalVerification.update({
      where: { id },
      data: {
        visitPhotos: dto.visitPhotos,
        status: PhysicalVerificationStatus.IN_PROGRESS,
        verificationNotes: dto.notes || verification.verificationNotes,
      },
    });

    return {
      message: "Foto kunjungan berhasil diupload",
      verification: updated,
    };
  }

  /**
   * Approve verification
   */
  async approveVerification(id: string, dto: ApproveVerificationDto, adminId: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    if (verification.status === PhysicalVerificationStatus.APPROVED) {
      throw new BadRequestException("Verifikasi sudah disetujui sebelumnya");
    }

    // Update verification and tenant in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update verification
      const updatedVerification = await tx.physicalVerification.update({
        where: { id },
        data: {
          status: PhysicalVerificationStatus.APPROVED,
          verifiedBy: adminId,
          approvedAt: new Date(),
          visitedDate: dto.visitedDate ? new Date(dto.visitedDate) : new Date(),
          verificationNotes: dto.verificationNotes,
        },
      });

      // Update tenant verified status
      await tx.tenant.update({
        where: { id: verification.tenantId },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      return updatedVerification;
    });

    // Notify seller
    await this.prisma.notification.create({
      data: {
        userId: verification.tenant.ownerId,
        tenantId: verification.tenantId,
        type: "PHYSICAL_VERIFICATION_APPROVED",
        title: "Verifikasi Fisik Disetujui",
        message: "Selamat! Toko Anda telah berhasil diverifikasi. Badge 'Verified' sekarang muncul di profil toko Anda.",
        metadata: {
          verificationId: id,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    return {
      message: "Verifikasi berhasil disetujui",
      verification: result,
    };
  }

  /**
   * Reject verification
   */
  async rejectVerification(id: string, dto: RejectVerificationDto, adminId: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    if (verification.status === PhysicalVerificationStatus.APPROVED) {
      throw new BadRequestException("Verifikasi sudah disetujui, tidak bisa ditolak");
    }

    const updated = await this.prisma.physicalVerification.update({
      where: { id },
      data: {
        status: PhysicalVerificationStatus.REJECTED,
        verifiedBy: adminId,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    // Notify seller
    await this.prisma.notification.create({
      data: {
        userId: verification.tenant.ownerId,
        tenantId: verification.tenantId,
        type: "PHYSICAL_VERIFICATION_REJECTED",
        title: "Verifikasi Fisik Ditolak",
        message: `Pengajuan verifikasi fisik Anda ditolak. Alasan: ${dto.rejectionReason}`,
        metadata: {
          verificationId: id,
          rejectionReason: dto.rejectionReason,
        },
      },
    });

    return {
      message: "Verifikasi ditolak",
      verification: updated,
    };
  }

  /**
   * Upload certificate
   */
  async uploadCertificate(id: string, dto: UploadCertificateDto, adminId: string) {
    const verification = await this.prisma.physicalVerification.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!verification) {
      throw new NotFoundException("Verifikasi tidak ditemukan");
    }

    if (verification.status !== PhysicalVerificationStatus.APPROVED) {
      throw new BadRequestException("Hanya verifikasi yang disetujui yang bisa diupload sertifikat");
    }

    const updated = await this.prisma.physicalVerification.update({
      where: { id },
      data: {
        certificateUrl: dto.certificateUrl,
        certificateUploadedAt: new Date(),
        certificateUploadedBy: adminId,
      },
    });

    // Notify seller
    await this.prisma.notification.create({
      data: {
        userId: verification.tenant.ownerId,
        tenantId: verification.tenantId,
        type: "PHYSICAL_VERIFICATION_CERTIFICATE",
        title: "Sertifikat Verifikasi Tersedia",
        message: "Sertifikat verifikasi fisik Anda sudah tersedia dan dapat didownload.",
        metadata: {
          verificationId: id,
          certificateUrl: dto.certificateUrl,
        },
      },
    });

    return {
      message: "Sertifikat berhasil diupload",
      verification: updated,
    };
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const [total, pending, scheduled, inProgress, approved, rejected] = await Promise.all([
      this.prisma.physicalVerification.count(),
      this.prisma.physicalVerification.count({ where: { status: PhysicalVerificationStatus.PENDING } }),
      this.prisma.physicalVerification.count({ where: { status: PhysicalVerificationStatus.SCHEDULED } }),
      this.prisma.physicalVerification.count({ where: { status: PhysicalVerificationStatus.IN_PROGRESS } }),
      this.prisma.physicalVerification.count({ where: { status: PhysicalVerificationStatus.APPROVED } }),
      this.prisma.physicalVerification.count({ where: { status: PhysicalVerificationStatus.REJECTED } }),
    ]);

    const recentApprovals = await this.prisma.physicalVerification.findMany({
      where: { status: PhysicalVerificationStatus.APPROVED },
      take: 5,
      orderBy: { approvedAt: "desc" },
      include: {
        tenant: {
          select: {
            name: true,
            city: true,
          },
        },
      },
    });

    return {
      total,
      pending,
      scheduled,
      inProgress,
      approved,
      rejected,
      recentApprovals,
    };
  }
}
