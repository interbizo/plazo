import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { EmailService } from "@modules/email/email.service";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";
import {
  PaymentMethod,
  TransactionType,
  TransactionStatus,
  WithdrawalStatus,
} from "@prisma/client";
import { PaginationHelper } from "@common/utils/pagination.helper";
import * as crypto from "crypto";

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notifEvents: NotificationEventsService,
  ) {}

  generatePaymentCode(): string {
    const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const random = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `PAY-${date}-${random}`;
  }

  /**
   * Get platform payment accounts (rekening tujuan transfer).
   * Nomor rekening ditampilkan FULL — buyer perlu nomor lengkap untuk transfer.
   * Endpoint ini hanya menampilkan akun yang aktif.
   */
  async getPaymentAccounts(tenantId?: string) {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: {
        tenantId: tenantId || null,
        isActive: true,
      },
      select: {
        id: true,
        type: true,
        bankName: true,
        accountNumber: true, // Full number — buyer needs this to transfer
        accountName: true,
        walletType: true,
        phoneNumber: true, // Full number
        isPrimary: true,
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return accounts;
  }

  /**
   * Validate that an imageUrl points to a legitimate platform upload.
   */
  private validateImageUrl(imageUrl: string): void {
    if (!imageUrl) {
      throw new BadRequestException("Image URL is required");
    }

    // Allow relative paths or full URLs that contain /uploads/
    const allowedPatterns = [
      /^\/uploads\//,                                    // Relative path
      /^https?:\/\/[^\/]+\/uploads\//,                  // Any domain with /uploads/
    ];

    const isValid = allowedPatterns.some((pattern) => pattern.test(imageUrl));
    if (!isValid) {
      throw new BadRequestException(
        "Invalid image URL. Only images uploaded through the platform are accepted.",
      );
    }

    // Prevent path traversal
    if (imageUrl.includes("..") || imageUrl.includes("//uploads")) {
      throw new BadRequestException("Invalid image URL format");
    }
  }

  async uploadPaymentProof(
    orderId: string,
    userId: string,
    data: {
      imageUrl: string;
      amount: number;
      paymentMethod: PaymentMethod;
      bankName?: string;
      accountName?: string;
      transactionDate?: Date;
      referenceNumber?: string;
    },
  ) {
    // Validate imageUrl
    this.validateImageUrl(data.imageUrl);

    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException("Payment amount must be positive");
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, buyerId: userId },
      include: {
        buyer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    if (!["PENDING_PAYMENT", "PENDING"].includes(order.status)) {
      throw new BadRequestException("Order is not waiting for payment");
    }

    // Validate amount matches order (tolerance Rp 1)
    const tolerance = 1;
    if (Math.abs(data.amount - order.amount) > tolerance) {
      this.logger.warn(
        `Payment amount mismatch for order ${orderId}: expected ${order.amount}, got ${data.amount}`,
      );
      throw new BadRequestException(
        `Payment amount (Rp ${data.amount.toLocaleString("id-ID")}) does not match order amount (Rp ${order.amount.toLocaleString("id-ID")})`,
      );
    }

    const existing = await this.prisma.paymentProof.findUnique({
      where: { orderId },
    });

    if (existing && existing.status === "PENDING") {
      throw new BadRequestException(
        "Payment proof already uploaded, waiting verification",
      );
    }

    const paymentProof = await this.prisma.paymentProof.upsert({
      where: { orderId },
      create: {
        orderId,
        uploadedBy: userId,
        imageUrl: data.imageUrl,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        bankName: data.bankName,
        accountName: data.accountName,
        transactionDate: data.transactionDate,
        referenceNumber: data.referenceNumber,
        status: "PENDING",
      },
      update: {
        imageUrl: data.imageUrl,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        bankName: data.bankName,
        accountName: data.accountName,
        transactionDate: data.transactionDate,
        referenceNumber: data.referenceNumber,
        status: "PENDING",
        uploadedAt: new Date(),
      },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "PAYMENT_UPLOADED" },
    });

    // Notify admins
    const adminUsers = await this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: { email: true },
    });

    for (const admin of adminUsers) {
      await this.emailService.sendPaymentProofUploadedEmail(
        admin.email,
        order.paymentCode || orderId,
        data.amount,
      );
    }

    const buyerName =
      `${order.buyer.firstName || ""} ${order.buyer.lastName || ""}`.trim() ||
      "Buyer";
    await this.notifEvents.onPaymentProofUploaded({
      tenantId: order.tenantId,
      orderTitle: order.title,
      orderId: order.id,
      buyerName,
      amount: data.amount,
    });

    return { message: "Bukti pembayaran berhasil diunggah", paymentProof };
  }

  async verifyPaymentProof(
    paymentProofId: string,
    verifierId: string,
    action: "VERIFY" | "REJECT",
    reason?: string,
  ) {
    const paymentProof = await this.prisma.paymentProof.findUnique({
      where: { id: paymentProofId },
      include: { order: true },
    });

    if (!paymentProof) {
      throw new BadRequestException("Payment proof not found");
    }

    if (paymentProof.status !== "PENDING") {
      throw new BadRequestException("Payment proof already processed");
    }

    if (action === "VERIFY") {
      await this.prisma.$transaction([
        this.prisma.paymentProof.update({
          where: { id: paymentProofId },
          data: {
            status: "VERIFIED",
            verifiedAt: new Date(),
            verifiedBy: verifierId,
          },
        }),
        this.prisma.order.update({
          where: { id: paymentProof.orderId },
          data: {
            status: "PAYMENT_VERIFIED",
            paidAt: new Date(),
            escrowHeldAt: new Date(),
          },
        }),
        this.prisma.paymentVerificationLog.create({
          data: {
            paymentProofId,
            action: "VERIFIED",
            performedBy: verifierId,
            reason,
          },
        }),
      ]);

      const buyer = await this.prisma.user.findUnique({
        where: { id: paymentProof.order.buyerId },
        select: { email: true },
      });

      if (buyer) {
        await this.emailService.sendPaymentVerifiedEmail(
          buyer.email,
          paymentProof.order.title,
        );
      }

      await this.notifEvents.onPaymentProofReviewed({
        tenantId: paymentProof.order.tenantId,
        buyerId: paymentProof.order.buyerId,
        sellerId: paymentProof.order.sellerId,
        orderTitle: paymentProof.order.title,
        orderId: paymentProof.orderId,
        action: "VERIFY",
      });

      return { message: "Pembayaran berhasil diverifikasi" };
    } else {
      await this.prisma.$transaction([
        this.prisma.paymentProof.update({
          where: { id: paymentProofId },
          data: {
            status: "REJECTED",
            rejectionReason: reason,
          },
        }),
        this.prisma.order.update({
          where: { id: paymentProof.orderId },
          data: { status: "PENDING_PAYMENT" },
        }),
        this.prisma.paymentVerificationLog.create({
          data: {
            paymentProofId,
            action: "REJECTED",
            performedBy: verifierId,
            reason,
          },
        }),
      ]);

      const buyer = await this.prisma.user.findUnique({
        where: { id: paymentProof.order.buyerId },
        select: { email: true },
      });

      if (buyer) {
        await this.emailService.sendPaymentRejectedEmail(
          buyer.email,
          paymentProof.order.title,
          reason || "Payment proof tidak valid",
        );
      }

      await this.notifEvents.onPaymentProofReviewed({
        tenantId: paymentProof.order.tenantId,
        buyerId: paymentProof.order.buyerId,
        sellerId: paymentProof.order.sellerId,
        orderTitle: paymentProof.order.title,
        orderId: paymentProof.orderId,
        action: "REJECT",
        reason,
      });

      return { message: "Bukti pembayaran ditolak", reason };
    }
  }

  async getPendingPaymentProofs(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [proofs, total] = await Promise.all([
      this.prisma.paymentProof.findMany({
        where: { status: "PENDING" },
        include: {
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
              paymentCode: true,
              buyer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { uploadedAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.paymentProof.count({
        where: { status: "PENDING" },
      }),
    ]);

    return {
      data: proofs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSellerBalance(userId: string) {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: {
        totalEarnings: true,
        totalOrders: true,
      },
    });

    if (!sellerProfile) {
      throw new NotFoundException("Seller profile not found");
    }

    const [pendingWithdrawals, completedWithdrawals] = await Promise.all([
      this.prisma.withdrawal.aggregate({
        where: { userId, status: "PENDING" },
        _sum: { amount: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: "COMPLETED" },
        _sum: { amount: true },
      }),
    ]);

    return {
      balance: sellerProfile.totalEarnings || 0,
      availableBalance: sellerProfile.totalEarnings || 0,
      pendingWithdrawal: pendingWithdrawals._sum.amount || 0,
      withdrawn: completedWithdrawals._sum.amount || 0,
      totalOrders: sellerProfile.totalOrders || 0,
    };
  }

  async getSellerTransactions(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: {
      userId: string;
      type?: TransactionType;
    } = { userId };

    if (type) {
      where.type = type as TransactionType;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return PaginationHelper.formatResponse(transactions, total, page, limit);
  }

  async requestWithdrawal(
    userId: string,
    data: {
      amount: number;
      paymentMethod: PaymentMethod;
      accountRef: string;
    },
  ) {
    if (!data.accountRef?.trim()) {
      throw new BadRequestException("Account reference is required");
    }

    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      select: { totalEarnings: true },
    });

    if (!sellerProfile) {
      throw new NotFoundException("Seller profile not found");
    }

    const availableBalance = sellerProfile.totalEarnings || 0;
    if (data.amount > availableBalance) {
      throw new BadRequestException("Insufficient balance");
    }

    const fee = 0;
    const netAmount = data.amount - fee;

    const [withdrawal] = await this.prisma.$transaction([
      this.prisma.withdrawal.create({
        data: {
          userId,
          amount: data.amount,
          fee,
          netAmount,
          paymentMethod: data.paymentMethod,
          accountRef: data.accountRef.trim(),
          status: "PENDING",
        },
      }),
      this.prisma.sellerProfile.update({
        where: { userId },
        data: {
          totalEarnings: {
            decrement: data.amount,
          },
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          amount: data.amount,
          fee,
          netAmount,
          status: "PENDING",
          description: `Withdrawal request via ${data.paymentMethod}`,
        },
      }),
    ]);

    return { message: "Withdrawal request submitted", withdrawal };
  }

  async getSellerWithdrawals(userId: string, page = 1, limit = 20) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const [withdrawals, total] = await Promise.all([
      this.prisma.withdrawal.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.withdrawal.count({ where: { userId } }),
    ]);

    return PaginationHelper.formatResponse(withdrawals, total, page, limit);
  }

  // ============================================
  // ADMIN: Payment Account CRUD
  // ============================================

  async getAllPaymentAccounts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [accounts, total] = await Promise.all([
      this.prisma.paymentAccount.findMany({
        skip,
        take: limit,
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.paymentAccount.count(),
    ]);

    return {
      data: accounts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createPaymentAccount(data: {
    type: PaymentMethod;
    bankName?: string;
    accountNumber: string;
    accountName: string;
    walletType?: string;
    phoneNumber?: string;
    isPrimary?: boolean;
    tenantId?: string;
  }) {
    // If setting as primary, unset other primaries for same tenant
    if (data.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: { tenantId: data.tenantId || null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.paymentAccount.create({
      data: {
        type: data.type,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        walletType: data.walletType,
        phoneNumber: data.phoneNumber,
        isPrimary: data.isPrimary ?? false,
        tenantId: data.tenantId || null,
        isActive: true,
      },
    });

    return { message: "Payment account created", account };
  }

  async updatePaymentAccount(
    accountId: string,
    data: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      walletType?: string;
      phoneNumber?: string;
      isPrimary?: boolean;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing) {
      throw new BadRequestException("Payment account not found");
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: {
          tenantId: existing.tenantId,
          isPrimary: true,
          id: { not: accountId },
        },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.paymentAccount.update({
      where: { id: accountId },
      data,
    });

    return { message: "Payment account updated", account };
  }

  async deletePaymentAccount(accountId: string) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing) {
      throw new BadRequestException("Payment account not found");
    }

    await this.prisma.paymentAccount.delete({
      where: { id: accountId },
    });

    return { message: "Payment account deleted" };
  }

  // ============ PLATFORM PAYMENT ACCOUNTS (Admin) ============

  async getPlatformPaymentAccounts() {
    const accounts = await this.prisma.paymentAccount.findMany({
      where: { tenantId: null },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });
    return { data: accounts };
  }

  async createPlatformPaymentAccount(data: {
    type: PaymentMethod;
    bankName?: string;
    accountNumber: string;
    accountName: string;
    walletType?: string;
    phoneNumber?: string;
    isActive?: boolean;
    isPrimary?: boolean;
  }) {
    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: { tenantId: null, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.paymentAccount.create({
      data: {
        ...data,
        tenantId: null,
        isVerified: true, // Platform accounts are auto-verified
      },
    });

    this.logger.log(`Platform payment account created: ${account.id}`);
    return { message: "Rekening platform berhasil ditambahkan", account };
  }

  async updatePlatformPaymentAccount(
    accountId: string,
    data: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
      walletType?: string;
      phoneNumber?: string;
      isActive?: boolean;
      isPrimary?: boolean;
    },
  ) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing || existing.tenantId !== null) {
      throw new BadRequestException("Platform payment account not found");
    }

    // If setting as primary, unset other primaries
    if (data.isPrimary) {
      await this.prisma.paymentAccount.updateMany({
        where: { tenantId: null, isPrimary: true, id: { not: accountId } },
        data: { isPrimary: false },
      });
    }

    const account = await this.prisma.paymentAccount.update({
      where: { id: accountId },
      data,
    });

    return { message: "Rekening platform berhasil diperbarui", account };
  }

  async deletePlatformPaymentAccount(accountId: string) {
    const existing = await this.prisma.paymentAccount.findUnique({
      where: { id: accountId },
    });

    if (!existing || existing.tenantId !== null) {
      throw new BadRequestException("Platform payment account not found");
    }

    await this.prisma.paymentAccount.delete({
      where: { id: accountId },
    });

    return { message: "Rekening platform berhasil dihapus" };
  }

  async getAllPaymentProofs(page = 1, limit = 50, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    const [proofs, total] = await Promise.all([
      this.prisma.paymentProof.findMany({
        where,
        skip,
        take: limit,
        include: {
          order: {
            select: {
              id: true,
              title: true,
              amount: true,
              paymentCode: true,
              buyer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          uploader: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.paymentProof.count({ where }),
    ]);

    return {
      data: proofs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async getPaymentProofDetail(proofId: string) {
    const proof = await this.prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        order: {
          include: {
            buyer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    thumbnail: true,
                    productType: true,
                    isDigital: true,
                  },
                },
              },
            },
          },
        },
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!proof) {
      throw new NotFoundException("Payment proof not found");
    }

    return { data: proof };
  }

  async getPaymentStats() {
    const [pending, verified, rejected, totalAmountPending] = await Promise.all([
      this.prisma.paymentProof.count({ where: { status: "PENDING" } }),
      this.prisma.paymentProof.count({ where: { status: "VERIFIED" } }),
      this.prisma.paymentProof.count({ where: { status: "REJECTED" } }),
      this.prisma.paymentProof.aggregate({
        where: { status: "PENDING" },
        _sum: { amount: true },
      }),
    ]);

    return {
      pending,
      verified,
      rejected,
      total: pending + verified + rejected,
      pendingAmount: totalAmountPending._sum.amount || 0,
    };
  }
}
