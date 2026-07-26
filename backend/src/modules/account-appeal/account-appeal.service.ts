import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { EmailService } from "@modules/email/email.service";
import { PaginationHelper } from "@common/utils/pagination.helper";

@Injectable()
export class AccountAppealService {
  private readonly logger = new Logger(AccountAppealService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * User submits an appeal for their suspended account
   */
  async submitAppeal(userId: string, reason: string, evidence?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true, firstName: true, lastName: true, email: true },
    });

    if (!user) throw new NotFoundException("User not found");

    if (user.accountStatus === "ACTIVE") {
      throw new BadRequestException("Akun Anda tidak dalam status suspend");
    }

    // Check if there's already a pending appeal
    const existingAppeal = await this.prisma.accountAppeal.findFirst({
      where: { userId, status: "PENDING" },
    });

    if (existingAppeal) {
      throw new BadRequestException("Anda sudah memiliki banding yang sedang diproses");
    }

    // Create appeal and update account status
    const appeal = await this.prisma.accountAppeal.create({
      data: { userId, reason, evidence },
    });

    // Update user status to UNDER_APPEAL
    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: "UNDER_APPEAL" },
    });

    // Notify admins about new appeal
    const userName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    // Get any tenant for notification context
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: userId },
      select: { id: true },
    });

    // Notify all admins
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true },
    });

    const tenantId = tenant?.id || "system";
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          userId: admin.id,
          title: "Banding Akun Baru",
          message: `${userName} mengajukan banding untuk pemulihan akun yang di-suspend`,
          type: "appeal",
          referenceId: appeal.id,
          referenceType: "account_appeal",
        },
      }).catch(() => {});
    }

    this.logger.log(`Appeal submitted by user ${userId}`);

    return {
      message: "Banding berhasil diajukan. Admin akan meninjau dalam 1-3 hari kerja.",
      appeal,
    };
  }

  /**
   * Get user's appeal history
   */
  async getUserAppeals(userId: string) {
    return this.prisma.accountAppeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Admin: List all appeals
   */
  async listAppeals(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = status ? { status } : {};

    const [appeals, total] = await Promise.all([
      this.prisma.accountAppeal.findMany({
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
              suspendedAt: true,
              suspendedReason: true,
              lastActiveAt: true,
              lastLoginAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.accountAppeal.count({ where }),
    ]);

    return PaginationHelper.formatResponse(appeals, total, page, limit);
  }

  /**
   * Admin: Approve appeal — restore account
   */
  async approveAppeal(appealId: string, adminId: string, adminNote?: string) {
    const appeal = await this.prisma.accountAppeal.findUnique({
      where: { id: appealId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    if (!appeal) throw new NotFoundException("Appeal not found");
    if (appeal.status !== "PENDING") {
      throw new BadRequestException("Appeal sudah diproses sebelumnya");
    }

    // Approve appeal + restore account
    await this.prisma.$transaction([
      this.prisma.accountAppeal.update({
        where: { id: appealId },
        data: {
          status: "APPROVED",
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNote,
        },
      }),
      this.prisma.user.update({
        where: { id: appeal.userId },
        data: {
          accountStatus: "ACTIVE",
          isActive: true,
          suspendedAt: null,
          suspendedReason: null,
          suspendedBy: null,
          gracePeriodEndsAt: null,
        },
      }),
    ]);

    // Reactivate all tenants owned by this user
    await this.prisma.tenant.updateMany({
      where: { ownerId: appeal.userId },
      data: { isActive: true },
    });

    this.logger.log(`Appeal ${appealId} approved by admin ${adminId}`);

    // Send notification + email to user
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: appeal.userId },
      select: { id: true },
    });
    const tenantId = tenant?.id || "system";

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: appeal.userId,
        title: "Banding Disetujui ✅",
        message: "Selamat! Banding Anda telah disetujui. Akun Anda telah dipulihkan dan aktif kembali.",
        type: "appeal",
        referenceId: appealId,
        referenceType: "account_appeal",
      },
    }).catch(() => {});

    // Send email
    if (appeal.user?.email) {
      this.emailService.sendEmail({
        to: appeal.user.email,
        subject: "Banding Disetujui — Akun Anda Telah Dipulihkan ✅",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">Banding Disetujui!</h2>
            <p>Halo <strong>${appeal.user.firstName || "User"}</strong>,</p>
            <p>Banding Anda telah <strong>disetujui</strong>. Akun Anda sekarang aktif kembali.</p>
            <p>Anda bisa login dan menggunakan semua fitur seperti biasa.</p>
            <a href="https://plazo.id/login" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
              Login Sekarang
            </a>
          </div>
        `,
      }).catch(() => {});
    }

    return { message: "Banding disetujui. Akun telah dipulihkan." };
  }

  /**
   * Admin: Reject appeal — keep suspended
   */
  async rejectAppeal(appealId: string, adminId: string, adminNote?: string) {
    const appeal = await this.prisma.accountAppeal.findUnique({
      where: { id: appealId },
    });

    if (!appeal) throw new NotFoundException("Appeal not found");
    if (appeal.status !== "PENDING") {
      throw new BadRequestException("Appeal sudah diproses sebelumnya");
    }

    // Reject appeal, revert to SUSPENDED
    await this.prisma.$transaction([
      this.prisma.accountAppeal.update({
        where: { id: appealId },
        data: {
          status: "REJECTED",
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminNote,
        },
      }),
      this.prisma.user.update({
        where: { id: appeal.userId },
        data: { accountStatus: "SUSPENDED" },
      }),
    ]);

    this.logger.log(`Appeal ${appealId} rejected by admin ${adminId}`);

    // Send notification to user
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: appeal.userId },
      select: { id: true },
    });
    const tenantId = tenant?.id || "system";

    await this.prisma.notification.create({
      data: {
        tenantId,
        userId: appeal.userId,
        title: "Banding Ditolak",
        message: `Banding Anda ditolak.${adminNote ? ` Alasan: ${adminNote}` : ""} Akun tetap dalam status suspend.`,
        type: "appeal",
        referenceId: appealId,
        referenceType: "account_appeal",
      },
    }).catch(() => {});

    // Send email
    const rejectedUser = await this.prisma.user.findUnique({
      where: { id: appeal.userId },
      select: { email: true, firstName: true },
    });
    if (rejectedUser?.email) {
      this.emailService.sendEmail({
        to: rejectedUser.email,
        subject: "Banding Ditolak — Akun Tetap Suspend",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">Banding Ditolak</h2>
            <p>Halo <strong>${rejectedUser.firstName || "User"}</strong>,</p>
            <p>Maaf, banding Anda telah <strong>ditolak</strong>. Akun Anda tetap dalam status suspend.</p>
            ${adminNote ? `<p><strong>Catatan Admin:</strong> ${adminNote}</p>` : ""}
            <p>Jika Anda merasa ini adalah kesalahan, Anda dapat mengajukan banding baru dengan bukti tambahan.</p>
          </div>
        `,
      }).catch(() => {});
    }

    return { message: "Banding ditolak. Akun tetap dalam status suspend." };
  }

  /**
   * Admin: Suspend a user account
   */
  async suspendUser(userId: string, adminId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Alasan suspend wajib diisi");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountStatus: true, role: true, isActive: true },
    });

    if (!user) throw new NotFoundException("User not found");
    if (user.role === "SUPER_ADMIN") {
      throw new ForbiddenException("Cannot suspend a Super Admin");
    }

    // If already suspended, just update the reason and reset grace period
    const gracePeriodEndsAt = new Date();
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + 30);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: "SUSPENDED",
        isActive: false,
        suspendedAt: new Date(),
        suspendedReason: reason,
        suspendedBy: adminId,
        gracePeriodEndsAt,
      },
    });

    // Deactivate all tenants owned by this user
    await this.prisma.tenant.updateMany({
      where: { ownerId: userId },
      data: { isActive: false },
    });

    // Revoke all refresh tokens so the user is immediately logged out
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    this.logger.log(`User ${userId} suspended by admin ${adminId}. Grace period ends: ${gracePeriodEndsAt.toISOString()}`);

    return { message: "Akun berhasil di-suspend. Grace period 30 hari dimulai." };
  }

  /**
   * Cron: Delete accounts past grace period (30 days after suspension)
   */
  async deleteExpiredAccounts() {
    const now = new Date();

    const expiredUsers = await this.prisma.user.findMany({
      where: {
        accountStatus: { in: ["SUSPENDED"] },
        gracePeriodEndsAt: { lt: now },
      },
      select: { id: true, email: true },
    });

    for (const user of expiredUsers) {
      try {
        // Soft delete — set deletedAt
        await this.prisma.user.update({
          where: { id: user.id },
          data: { deletedAt: now },
        });
        this.logger.log(`Account permanently deleted (grace period expired): ${user.email}`);
      } catch (error) {
        this.logger.error(`Failed to delete expired account ${user.id}:`, error);
      }
    }

    return { deleted: expiredUsers.length };
  }
}
