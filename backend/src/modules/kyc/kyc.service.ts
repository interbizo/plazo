import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";
import { EmailService } from "@modules/email/email.service";
import { SubmitKycDto, AdminReviewKycDto } from "./kyc.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { KycEncryption } from "@common/utils/kyc-encryption.util";

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private prisma: PrismaService,
    private notifEvents: NotificationEventsService,
    private emailService: EmailService,
  ) {}

  /**
   * Submit KYC verification with encryption
   * Security measures:
   * - KTP number is encrypted (AES-256) AND hashed (SHA-256)
   * - Full name, address, DOB are encrypted
   * - KTP photos stored in secure directory (not publicly accessible)
   * - Selfie with KTP is REQUIRED
   * - Duplicate KTP detection via hash
   * - IP address logged for audit trail
   */
  async submitKyc(userId: string, dto: SubmitKycDto, ipAddress?: string) {
    // Check if already submitted
    const existing = await this.prisma.kycSubmission.findUnique({
      where: { userId },
    });
    if (existing && existing.status === "APPROVED") {
      throw new BadRequestException("KYC sudah disetujui");
    }
    if (existing && existing.status === "PENDING") {
      throw new BadRequestException("KYC sedang dalam proses review");
    }

    // Validate KTP number format (16 digits)
    if (!/^\d{16}$/.test(dto.ktpNumber)) {
      throw new BadRequestException("NIK harus 16 digit angka");
    }

    // Encrypt and hash KTP number
    const ktpNumberEncrypted = KycEncryption.encryptKtpNumber(dto.ktpNumber);
    const ktpNumberHash = KycEncryption.hashKtpNumber(dto.ktpNumber);

    // Check for duplicate KTP (same person registering multiple accounts)
    const duplicate = await this.prisma.kycSubmission.findFirst({
      where: { ktpNumberHash, status: "APPROVED", userId: { not: userId } },
    });
    if (duplicate) {
      throw new BadRequestException(
        "NIK ini sudah terverifikasi di akun lain. Satu NIK hanya untuk satu akun.",
      );
    }

    // Encrypt sensitive data
    const fullNameEncrypted = KycEncryption.encryptFullName(dto.fullName);
    const addressEncrypted = dto.address ? KycEncryption.encryptAddress(dto.address) : null;
    const dobEncrypted = dto.dateOfBirth ? KycEncryption.encryptDob(dto.dateOfBirth) : null;
    
    // Encrypt file paths for security
    const ktpPhotoPathEncrypted = KycEncryption.encrypt(dto.ktpPhotoPath);
    const selfieWithKtpPathEncrypted = KycEncryption.encrypt(dto.selfieWithKtpPath);

    // Delete old rejected submission if exists
    if (existing && existing.status === "REJECTED") {
      await this.prisma.kycSubmission.delete({ where: { userId } });
    }

    const submission = await this.prisma.kycSubmission.create({
      data: {
        userId,
        ktpNumberHash,
        ktpNumberEncrypted,
        fullNameEncrypted,
        addressEncrypted,
        dobEncrypted,
        ktpPhotoPath: ktpPhotoPathEncrypted,
        selfieWithKtpPath: selfieWithKtpPathEncrypted,
        status: "PENDING",
        ipAddress,
      },
    });

    // Update user KYC status
    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: "PENDING" },
    });

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found`);
      return submission;
    }

    // Get tenantId from owned tenant
    const ownedTenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    // If no owned tenant, get from tenant membership (many-to-many relation)
    let tenantId = ownedTenant?.id;
    if (!tenantId) {
      const memberTenant = await this.prisma.tenant.findFirst({
        where: {
          members: {
            some: { id: userId },
          },
        },
        select: { id: true },
      });
      tenantId = memberTenant?.id;
    }
    
    if (!tenantId) {
      this.logger.warn(`User ${userId} has no tenant association. KYC notification will not be sent.`);
    } else {
      const userName =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Pengguna";
      
      this.logger.log(`Sending KYC submission notification for user ${userId} to tenant ${tenantId}`);
      
      try {
        await this.notifEvents.onKycSubmitted({
          tenantId,
          userName,
          userId,
        });
        this.logger.log(`KYC notification sent successfully for user ${userId}`);
      } catch (error) {
        this.logger.error(`Failed to send KYC notification for user ${userId}:`, error);
      }
    }

    this.logger.log(`KYC submitted for user ${userId} from IP ${ipAddress}`);

    return {
      message:
        "KYC berhasil diajukan. Verifikasi biasanya memakan waktu 1-3 hari kerja.",
      status: "PENDING",
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Get KYC status for user (safe - no sensitive data exposed)
   */
  async getKycStatus(userId: string) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { userId },
      select: {
        status: true,
        fullNameEncrypted: true,
        rejectionReason: true,
        verifiedAt: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    if (!submission) {
      return { status: "NOT_SUBMITTED", message: "KYC not yet submitted" };
    }

    // Decrypt full name for display
    let fullName = '[ENCRYPTED]';
    try {
      fullName = KycEncryption.decryptFullName(submission.fullNameEncrypted);
    } catch {
      fullName = '[DECRYPTION ERROR]';
    }

    return {
      status: submission.status,
      fullName,
      submittedAt: submission.submittedAt,
      verifiedAt: submission.verifiedAt,
      rejectionReason: submission.rejectionReason,
    };
  }

  /**
   * Admin: List KYC submissions for review
   * Decrypts sensitive data for admin view
   */
  async listKycSubmissions(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = status ? { status } : {};

    const [submissions, total] = await Promise.all([
      this.prisma.kycSubmission.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.kycSubmission.count({ where }),
    ]);

    // Decrypt sensitive data for admin view
    const safeSubmissions = submissions.map((s) => {
      try {
        const ktpNumber = KycEncryption.decryptKtpNumber(s.ktpNumberEncrypted);
        const fullName = KycEncryption.decryptFullName(s.fullNameEncrypted);
        const address = s.addressEncrypted ? KycEncryption.decryptAddress(s.addressEncrypted) : null;
        const dob = s.dobEncrypted ? KycEncryption.decryptDob(s.dobEncrypted) : null;

        return {
          id: s.id,
          userId: s.userId,
          user: s.user,
          ktpNumber: KycEncryption.maskKtpNumber(ktpNumber), // Masked for list view
          ktpNumberFull: ktpNumber, // Full number for detail view
          fullName,
          address,
          dateOfBirth: dob,
          ktpPhotoPath: s.ktpPhotoPath,
          selfieWithKtpPath: s.selfieWithKtpPath,
          status: s.status,
          rejectionReason: s.rejectionReason,
          submittedAt: s.submittedAt,
          verifiedAt: s.verifiedAt,
          ipAddress: s.ipAddress,
        };
      } catch (error) {
        this.logger.error(`Failed to decrypt KYC data for submission ${s.id}:`, error);
        return {
          id: s.id,
          userId: s.userId,
          user: s.user,
          ktpNumber: '[DECRYPTION ERROR]',
          fullName: '[DECRYPTION ERROR]',
          address: null,
          dateOfBirth: null,
          ktpPhotoPath: s.ktpPhotoPath,
          selfieWithKtpPath: s.selfieWithKtpPath,
          status: s.status,
          rejectionReason: s.rejectionReason,
          submittedAt: s.submittedAt,
          verifiedAt: s.verifiedAt,
          ipAddress: s.ipAddress,
        };
      }
    });

    return PaginationHelper.formatResponse(safeSubmissions, total, page, limit);
  }

  /**
   * Admin: Review and approve/reject KYC
   */
  async reviewKyc(
    submissionId: string,
    adminId: string,
    dto: AdminReviewKycDto,
  ) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException("KYC submission not found");
    if (submission.status !== "PENDING")
      throw new BadRequestException("Submission already reviewed");

    if (dto.action === "approve") {
      await this.prisma.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: "APPROVED",
          verifiedBy: adminId,
          verifiedAt: new Date(),
        },
      });
      
      const now = new Date();
      
      // Update user KYC status
      await this.prisma.user.update({
        where: { id: submission.userId },
        data: { kycStatus: "APPROVED", kycVerifiedAt: now },
      });

      // Update tenant isVerified status (for verified badge)
      const userTenant = await this.prisma.user.findUnique({
        where: { id: submission.userId },
        select: {
          tenants: { select: { id: true }, take: 1 },
          tenantMembers: { select: { id: true }, take: 1 },
        },
      });
      
      const tenantId = userTenant?.tenants[0]?.id || userTenant?.tenantMembers[0]?.id;
      
      if (tenantId) {
        // Set tenant as verified when KYC is approved
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: {
            isVerified: true,
            verifiedAt: now,
          },
        });
        
        await this.notifEvents.onKycReviewed({
          tenantId,
          userId: submission.userId,
          approved: true,
        });
      }

      // Send KYC approved email (non-blocking)
      const approvedUser = await this.prisma.user.findUnique({
        where: { id: submission.userId },
        select: { email: true, firstName: true },
      });
      if (approvedUser?.email) {
        this.emailService.sendKycApprovedEmail(approvedUser.email, approvedUser.firstName || "User").catch(() => {});
      }

      return { message: "KYC berhasil disetujui" };
    } else {
      if (!dto.rejectionReason) {
        throw new BadRequestException("Rejection reason required");
      }
      await this.prisma.kycSubmission.update({
        where: { id: submissionId },
        data: {
          status: "REJECTED",
          rejectionReason: dto.rejectionReason,
          verifiedBy: adminId,
          verifiedAt: new Date(),
        },
      });
      await this.prisma.user.update({
        where: { id: submission.userId },
        data: { kycStatus: "REJECTED" },
      });

      const userTenant = await this.prisma.user.findUnique({
        where: { id: submission.userId },
        select: {
          tenants: { select: { id: true }, take: 1 },
          tenantMembers: { select: { id: true }, take: 1 },
        },
      });
      const tenantId = userTenant?.tenants[0]?.id || userTenant?.tenantMembers[0]?.id;
      if (tenantId) {
        await this.notifEvents.onKycReviewed({
          tenantId,
          userId: submission.userId,
          approved: false,
          reason: dto.rejectionReason,
        });
      }

      // Send KYC rejected email (non-blocking)
      const rejectedUser = await this.prisma.user.findUnique({
        where: { id: submission.userId },
        select: { email: true, firstName: true },
      });
      if (rejectedUser?.email) {
        this.emailService.sendKycRejectedEmail(
          rejectedUser.email,
          rejectedUser.firstName || "User",
          dto.rejectionReason || "Dokumen tidak valid",
        ).catch(() => {});
      }

      return { message: "KYC ditolak" };
    }
  }
}
