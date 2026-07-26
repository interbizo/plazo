import { Injectable, Logger, Inject, Optional, forwardRef } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { EmailService } from "@modules/email/email.service";
import { ChatGateway } from "@modules/websocket/chat.gateway";

/**
 * Centralized notification event helper.
 * Call from any service to create in-app + email notifications.
 */
@Injectable()
export class NotificationEventsService {
  private readonly logger = new Logger(NotificationEventsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    @Optional()
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway?: ChatGateway,
  ) {}

  /**
   * Send notification via WebSocket with retry mechanism.
   * If WebSocket fails, the notification is still saved in DB.
   */
  private async sendWebSocketNotification(
    userId: string,
    notification: any,
    retries: number = 2,
  ): Promise<boolean> {
    if (!this.chatGateway) {
      return false;
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.chatGateway.sendNotificationToUser(userId, notification);
        return true;
      } catch (error) {
        if (attempt === retries) {
          // Final attempt failed
          this.logger.error(
            `Failed to send WebSocket notification to user ${userId} after ${retries + 1} attempts`,
            error,
          );
          return false;
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  private async createNotification(params: {
    tenantId: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    try {
      // Check for duplicate notification in the last 5 minutes
      // This prevents spam and duplicate notifications
      if (params.referenceId && params.referenceType) {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        
        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: params.userId,
            type: params.type,
            referenceId: params.referenceId,
            referenceType: params.referenceType,
            createdAt: {
              gte: fiveMinutesAgo,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (existingNotification) {
          this.logger.warn(
            `Duplicate notification prevented for user ${params.userId}, type: ${params.type}, ref: ${params.referenceId}`,
          );
          return existingNotification;
        }
      }

      // Create new notification
      const notification = await this.prisma.notification.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          referenceId: params.referenceId,
          referenceType: params.referenceType,
        },
      });

      // Push real-time via WebSocket with retry mechanism
      await this.sendWebSocketNotification(params.userId, notification);

      return notification;
    } catch (error) {
      this.logger.error("Failed to create notification", error);
      return null;
    }
  }

  private async notifyUsers(
    tenantId: string,
    userIds: string[],
    payload: {
      title: string;
      message: string;
      type: string;
      referenceId?: string;
      referenceType?: string;
    },
  ) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    await Promise.all(
      uniqueUserIds.map((userId) =>
        this.createNotification({
          tenantId,
          userId,
          ...payload,
        }),
      ),
    );
  }

  /**
   * Bulk create notifications with WebSocket push support.
   * Use this instead of prisma.notification.createMany() to ensure realtime delivery.
   */
  async bulkCreateNotifications(
    notifications: Array<{
      tenantId: string;
      userId: string;
      title: string;
      message: string;
      type: string;
      referenceId?: string;
      referenceType?: string;
    }>,
  ) {
    // Create notifications individually to enable WebSocket push
    const createdNotifications = await Promise.all(
      notifications.map((notif) => this.createNotification(notif)),
    );

    return createdNotifications.filter(Boolean); // Filter out any failed creations
  }

  private async notifyAdminRoles(params: {
    tenantId: string;
    title: string;
    message: string;
    type: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    await this.notifyUsers(
      params.tenantId,
      admins.map((admin) => admin.id),
      params,
    );
  }

  // === PROPOSAL EVENTS ===

  async onProposalSubmitted(params: {
    tenantId: string;
    buyerId: string;
    sellerName: string;
    jobTitle: string;
    jobId: string;
    proposalId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.buyerId,
      title: "Proposal Baru Masuk",
      message: `${params.sellerName} mengirim proposal untuk "${params.jobTitle}"`,
      type: "proposal",
      referenceId: params.proposalId,
      referenceType: "proposal",
    });
  }

  async onProposalAccepted(params: {
    tenantId: string;
    sellerId: string;
    sellerEmail: string;
    jobTitle: string;
    jobId: string;
    proposalId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Proposal Diterima",
      message: `Proposal Anda untuk "${params.jobTitle}" telah diterima`,
      type: "proposal",
      referenceId: params.proposalId,
      referenceType: "proposal",
    });
    await this.emailService.sendProposalNotificationEmail(
      params.sellerEmail,
      params.jobTitle,
      "Accepted",
    );
  }

  async onProposalRejected(params: {
    tenantId: string;
    sellerId: string;
    sellerEmail: string;
    jobTitle: string;
    proposalId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Proposal Ditolak",
      message: `Proposal Anda untuk "${params.jobTitle}" ditolak`,
      type: "proposal",
      referenceId: params.proposalId,
      referenceType: "proposal",
    });
    await this.emailService.sendProposalNotificationEmail(
      params.sellerEmail,
      params.jobTitle,
      "Rejected",
    );
  }

  // === ORDER EVENTS ===

  async onOrderCreated(params: {
    tenantId: string;
    sellerId: string;
    sellerEmail: string;
    orderTitle: string;
    orderId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Pesanan Baru Masuk",
      message: `Anda menerima pesanan baru: "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
    await this.emailService.sendOrderNotificationEmail(
      params.sellerEmail,
      params.orderTitle,
      "New Order",
    );
  }

  async onOrderStatusChanged(params: {
    tenantId: string;
    buyerId: string;
    buyerEmail: string;
    sellerId: string;
    sellerEmail: string;
    orderTitle: string;
    orderId: string;
    newStatus: string;
    updatedBy: string; // userId of who updated
  }) {
    // Notify the other party
    const notifyUserId =
      params.updatedBy === params.buyerId ? params.sellerId : params.buyerId;
    const notifyEmail =
      params.updatedBy === params.buyerId
        ? params.sellerEmail
        : params.buyerEmail;

    await this.createNotification({
      tenantId: params.tenantId,
      userId: notifyUserId,
      title: "Status Pesanan Diperbarui",
      message: `Status pesanan "${params.orderTitle}" berubah menjadi ${params.newStatus}`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
    await this.emailService.sendOrderNotificationEmail(
      notifyEmail,
      params.orderTitle,
      params.newStatus,
    );
  }

  // === REVIEW EVENTS ===

  async onReviewCreated(params: {
    tenantId: string;
    receiverId: string;
    giverName: string;
    rating: number;
    orderId?: string | null;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.receiverId,
      title: "Ulasan Baru",
      message: `${params.giverName} memberi Anda ulasan ${params.rating} bintang`,
      type: "review",
      referenceId: params.orderId || undefined,
      referenceType: params.orderId ? "order" : "review",
    });
  }

  // === JOB EVENTS ===

  async onNewJobPosted(params: {
    tenantId: string;
    jobTitle: string;
    jobId: string;
    budget: number;
    tags?: string[];
    categoryId?: string;
  }) {
    // Find sellers in this tenant with matching skills or all active sellers
    const where: any = {
      role: "SELLER",
      isActive: true,
      tenants: { some: { id: params.tenantId } },
    };

    // If job has tags, try to match sellers with those skills
    if (params.tags && params.tags.length > 0) {
      where.sellerProfile = {
        skills: { hasSome: params.tags },
      };
    }

    let sellers = await this.prisma.user.findMany({
      where,
      select: { id: true },
      take: 50,
    });

    // If no skill-matched sellers found, notify all sellers in tenant
    if (sellers.length === 0 && params.tags && params.tags.length > 0) {
      sellers = await this.prisma.user.findMany({
        where: {
          role: "SELLER",
          isActive: true,
          tenants: { some: { id: params.tenantId } },
        },
        select: { id: true },
        take: 50,
      });
    }

    const budgetStr = params.budget
      ? ` dengan budget Rp ${params.budget.toLocaleString("id-ID")}`
      : "";
    const message = `Ada job baru: "${params.jobTitle}"${budgetStr}`;

    if (sellers.length > 0) {
      // Create notifications individually to get the created records
      // This allows us to push via WebSocket
      const notificationPromises = sellers.map((seller) =>
        this.createNotification({
          tenantId: params.tenantId,
          userId: seller.id,
          title: "Job Baru Tersedia",
          message,
          type: "job",
          referenceId: params.jobId,
          referenceType: "job",
        }),
      );

      // Execute all notification creations in parallel
      await Promise.all(notificationPromises);
    }

    this.logger.log(
      `Notified ${sellers.length} sellers about job: ${params.jobTitle}`,
    );
  }

  // === CHAT EVENTS ===

  async onNewChatMessage(params: {
    tenantId: string;
    recipientId: string;
    senderName: string;
    roomId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.recipientId,
      title: "Pesan Baru",
      message: `${params.senderName} mengirim pesan kepada Anda`,
      type: "chat",
      referenceId: params.roomId,
      referenceType: "chatroom",
    });
  }

  // === DISPUTE EVENTS ===

  async onDisputeOpened(params: {
    tenantId: string;
    buyerId: string;
    sellerId: string;
    otherPartyId: string;
    orderTitle: string;
    disputeId: string;
    openedByName: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.otherPartyId,
      title: "Sengketa Dibuka",
      message: `Sengketa untuk pesanan "${params.orderTitle}" telah dibuka oleh ${params.openedByName}`,
      type: "dispute",
      referenceId: params.disputeId,
      referenceType: "dispute",
    });

    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Sengketa Baru Memerlukan Tinjauan",
      message: `Sengketa baru dibuka untuk pesanan "${params.orderTitle}"`,
      type: "dispute",
      referenceId: params.disputeId,
      referenceType: "dispute",
    });
  }

  async onDisputeUnderReview(params: {
    tenantId: string;
    buyerId: string;
    sellerId: string;
    orderTitle: string;
    disputeId: string;
  }) {
    await this.notifyUsers(params.tenantId, [params.buyerId, params.sellerId], {
      title: "Sengketa Sedang Ditinjau",
      message: `Sengketa untuk pesanan "${params.orderTitle}" sedang ditinjau oleh admin`,
      type: "dispute",
      referenceId: params.disputeId,
      referenceType: "dispute",
    });
  }

  async onDisputeResolved(params: {
    tenantId: string;
    buyerId: string;
    sellerId: string;
    orderTitle: string;
    resolution: string;
    disputeId: string;
  }) {
    const message = `Sengketa untuk pesanan "${params.orderTitle}" telah diselesaikan: ${params.resolution}`;
    for (const userId of [params.buyerId, params.sellerId]) {
      await this.createNotification({
        tenantId: params.tenantId,
        userId,
        title: "Sengketa Diselesaikan",
        message,
        type: "dispute",
        referenceId: params.disputeId,
        referenceType: "dispute",
      });
    }
  }

  // === DELIVERY EVENTS ===

  async onDeliverySubmitted(params: {
    tenantId: string;
    buyerId: string;
    orderTitle: string;
    orderId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.buyerId,
      title: "Pesanan Telah Dikirim",
      message: `Seller mengirim hasil untuk "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onDeliveryAccepted(params: {
    tenantId: string;
    sellerId: string;
    orderTitle: string;
    orderId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Hasil Pesanan Diterima",
      message: `Buyer menerima hasil pesanan Anda untuk "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onRevisionRequested(params: {
    tenantId: string;
    sellerId: string;
    orderTitle: string;
    orderId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Revisi Diminta",
      message: `Buyer meminta revisi untuk "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  // === CANCELLATION EVENTS ===

  async onCancellationRequested(params: {
    tenantId: string;
    recipientId: string;
    orderTitle: string;
    orderId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.recipientId,
      title: "Permintaan Pembatalan",
      message: `Ada permintaan pembatalan untuk "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onCancellationResponded(params: {
    tenantId: string;
    recipientId: string;
    orderTitle: string;
    orderId: string;
    accepted: boolean;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.recipientId,
      title: params.accepted
        ? "Pembatalan Disetujui"
        : "Pembatalan Ditolak",
      message: params.accepted
        ? `Pembatalan untuk "${params.orderTitle}" telah disetujui`
        : `Pembatalan untuk "${params.orderTitle}" ditolak`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  // === EXTENSION EVENTS ===

  async onExtensionRequested(params: {
    tenantId: string;
    buyerId: string;
    orderTitle: string;
    orderId: string;
    extraDays: number;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.buyerId,
      title: "Permintaan Perpanjangan",
      message: `Seller meminta perpanjangan ${params.extraDays} hari untuk "${params.orderTitle}"`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onExtensionResponded(params: {
    tenantId: string;
    sellerId: string;
    orderTitle: string;
    orderId: string;
    accepted: boolean;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: params.accepted
        ? "Perpanjangan Disetujui"
        : "Perpanjangan Ditolak",
      message: params.accepted
        ? `Perpanjangan untuk "${params.orderTitle}" telah disetujui`
        : `Perpanjangan untuk "${params.orderTitle}" ditolak`,
      type: "order",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  // === CUSTOM OFFER EVENTS ===

  async onCustomOfferSent(params: {
    tenantId: string;
    buyerId: string;
    sellerName: string;
    offerTitle: string;
    offerId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.buyerId,
      title: "Penawaran Kustom Baru",
      message: `${params.sellerName} mengirim penawaran kustom: "${params.offerTitle}"`,
      type: "offer",
      referenceId: params.offerId,
      referenceType: "custom_offer",
    });
  }

  async onCustomOfferAccepted(params: {
    tenantId: string;
    sellerId: string;
    buyerName: string;
    offerTitle: string;
    offerId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Penawaran Diterima",
      message: `${params.buyerName} menerima penawaran Anda: "${params.offerTitle}"`,
      type: "offer",
      referenceId: params.offerId,
      referenceType: "custom_offer",
    });
  }

  async onCustomOfferDeclined(params: {
    tenantId: string;
    sellerId: string;
    buyerName: string;
    offerTitle: string;
    offerId: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Penawaran Ditolak",
      message: `${params.buyerName} menolak penawaran Anda: "${params.offerTitle}"`,
      type: "offer",
      referenceId: params.offerId,
      referenceType: "custom_offer",
    });
  }

  async onPaymentProofUploaded(params: {
    tenantId: string;
    orderTitle: string;
    orderId: string;
    buyerName: string;
    amount: number;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Bukti Pembayaran Baru",
      message: `${params.buyerName} mengunggah bukti pembayaran untuk "${params.orderTitle}" sebesar Rp ${params.amount.toLocaleString("id-ID")}`,
      type: "payment",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onPaymentProofReviewed(params: {
    tenantId: string;
    buyerId: string;
    sellerId: string;
    orderTitle: string;
    orderId: string;
    action: "VERIFY" | "REJECT";
    reason?: string;
  }) {
    const approved = params.action === "VERIFY";
    await this.notifyUsers(params.tenantId, [params.buyerId, params.sellerId], {
      title: approved
        ? "Pembayaran Diverifikasi"
        : "Bukti Pembayaran Ditolak",
      message: approved
        ? `Pembayaran untuk "${params.orderTitle}" telah diverifikasi admin`
        : `Bukti pembayaran untuk "${params.orderTitle}" ditolak${params.reason ? `: ${params.reason}` : ""}`,
      type: "payment",
      referenceId: params.orderId,
      referenceType: "order",
    });
  }

  async onKycSubmitted(params: {
    tenantId: string;
    userName: string;
    userId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Pengajuan KYC Baru",
      message: `${params.userName} mengajukan verifikasi KYC dan menunggu review admin`,
      type: "kyc",
      referenceId: params.userId,
      referenceType: "user",
    });
  }

  async onKycReviewed(params: {
    tenantId: string;
    userId: string;
    approved: boolean;
    reason?: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.approved ? "KYC Disetujui" : "KYC Ditolak",
      message: params.approved
        ? "Pengajuan KYC Anda telah disetujui"
        : `Pengajuan KYC Anda ditolak${params.reason ? `: ${params.reason}` : ""}`,
      type: "kyc",
      referenceId: params.userId,
      referenceType: "user",
    });
  }

  async notifyReportReply(
    reporterId: string,
    reportId: string,
    adminName: string,
    message: string,
  ) {
    // Get reporter with tenant info
    const reporter = await this.prisma.user.findUnique({
      where: { id: reporterId },
      select: { 
        id: true,
        tenants: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!reporter) {
      this.logger.warn(`Reporter ${reporterId} not found`);
      return;
    }

    // Use first tenant or a default tenant ID
    const tenantId = reporter.tenants?.[0]?.id || "default-tenant";

    // Truncate message if too long
    const truncatedMessage = message.length > 100 
      ? message.substring(0, 100) + "..." 
      : message;

    await this.createNotification({
      tenantId,
      userId: reporterId,
      title: "Balasan Admin pada Laporan Anda",
      message: `${adminName}: ${truncatedMessage}`,
      type: "report",
      referenceId: reportId,
      referenceType: "report",
    });
  }

  // === SUBSCRIPTION & PAYMENT EVENTS ===

  async onSubscriptionPaymentSubmitted(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    plan: string;
    amount: number;
    paymentId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Pembayaran Subscription Baru",
      message: `${params.sellerName} mengajukan pembayaran subscription ${params.plan} sebesar Rp ${params.amount.toLocaleString("id-ID")}`,
      type: "subscription",
      referenceId: params.paymentId,
      referenceType: "subscription_payment",
    });
  }

  async onSubscriptionPlanChanged(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    fromPlan: string;
    toPlan: string;
  }) {
    const action = params.toPlan > params.fromPlan ? "Upgrade" : "Downgrade";
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: `Subscription ${action}`,
      message: `${params.sellerName} ${action.toLowerCase()} dari ${params.fromPlan} ke ${params.toPlan}`,
      type: "subscription",
      referenceId: params.sellerId,
      referenceType: "user",
    });
  }

  async onSubscriptionExpiringSoon(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    plan: string;
    daysLeft: number;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Subscription Akan Expired",
      message: `Subscription ${params.plan} milik ${params.sellerName} akan expired dalam ${params.daysLeft} hari`,
      type: "subscription",
      referenceId: params.sellerId,
      referenceType: "user",
    });
  }

  async onAffiliateClaimRequested(params: {
    tenantId: string;
    affiliateId: string;
    affiliateName: string;
    amount: number;
    claimId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Klaim Affiliate Baru",
      message: `${params.affiliateName} mengajukan klaim affiliate sebesar Rp ${params.amount.toLocaleString("id-ID")}`,
      type: "affiliate",
      referenceId: params.claimId,
      referenceType: "affiliate_claim",
    });
  }

  // === PHYSICAL VERIFICATION EVENTS ===

  async onPhysicalVerificationRequested(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    storeName: string;
    storeAddress: string;
    verificationId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Permintaan Verifikasi Fisik Baru",
      message: `${params.sellerName} (${params.storeName}) mengajukan verifikasi fisik toko di ${params.storeAddress}`,
      type: "verification",
      referenceId: params.verificationId,
      referenceType: "physical_verification",
    });
  }

  async onPhysicalVerificationScheduled(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    scheduledDate: Date;
    verificationId: string;
  }) {
    // Notify seller
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: "Verifikasi Fisik Dijadwalkan",
      message: `Verifikasi fisik toko Anda dijadwalkan pada ${params.scheduledDate.toLocaleDateString("id-ID")}`,
      type: "verification",
      referenceId: params.verificationId,
      referenceType: "physical_verification",
    });

    // Notify admins
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Verifikasi Fisik Dijadwalkan",
      message: `Verifikasi fisik untuk ${params.sellerName} dijadwalkan pada ${params.scheduledDate.toLocaleDateString("id-ID")}`,
      type: "verification",
      referenceId: params.verificationId,
      referenceType: "physical_verification",
    });
  }

  async onPhysicalVerificationCompleted(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    approved: boolean;
    verificationId: string;
  }) {
    // Notify seller
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: params.approved ? "Verifikasi Fisik Disetujui" : "Verifikasi Fisik Ditolak",
      message: params.approved
        ? "Selamat! Toko Anda telah diverifikasi secara fisik dan mendapat badge verified"
        : "Verifikasi fisik toko Anda tidak disetujui. Silakan hubungi admin untuk informasi lebih lanjut",
      type: "verification",
      referenceId: params.verificationId,
      referenceType: "physical_verification",
    });
  }

  // === STORE & CONTENT MANAGEMENT EVENTS ===

  async onNewProductCreated(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    productName: string;
    productId: string;
    price: number;
    publishToMarketplace: boolean;
  }) {
    // Only notify admin if product is published to marketplace (needs moderation)
    if (params.publishToMarketplace) {
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Produk Baru di Marketplace",
        message: `${params.sellerName} menambahkan produk "${params.productName}" (Rp ${params.price.toLocaleString("id-ID")}) ke marketplace`,
        type: "product",
        referenceId: params.productId,
        referenceType: "product",
      });
    }
  }

  async onNewServiceCreated(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    serviceName: string;
    serviceId: string;
    basePrice: number;
    publishToMarketplace: boolean;
  }) {
    // Only notify admin if service is published to marketplace (needs moderation)
    if (params.publishToMarketplace) {
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Layanan Baru di Marketplace",
        message: `${params.sellerName} menambahkan layanan "${params.serviceName}" (Rp ${params.basePrice.toLocaleString("id-ID")}) ke marketplace`,
        type: "service",
        referenceId: params.serviceId,
        referenceType: "service",
      });
    }
  }

  async onFlashSaleRequested(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    itemName: string;
    itemType: "product" | "service";
    originalPrice: number;
    salePrice: number;
    flashSaleId: string;
  }) {
    const discount = Math.round(((params.originalPrice - params.salePrice) / params.originalPrice) * 100);
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Permintaan Flash Sale Baru",
      message: `${params.sellerName} mengajukan flash sale untuk ${params.itemType} "${params.itemName}" dengan diskon ${discount}% (Rp ${params.originalPrice.toLocaleString("id-ID")} → Rp ${params.salePrice.toLocaleString("id-ID")})`,
      type: "flash_sale",
      referenceId: params.flashSaleId,
      referenceType: "flash_sale",
    });
  }

  // === USER MANAGEMENT EVENTS ===

  async onNewUserRegistered(params: {
    tenantId: string;
    userId: string;
    userName: string;
    email: string;
    role: string;
  }) {
    // Only notify for SELLER registrations (more important for business)
    if (params.role === "SELLER") {
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Seller Baru Terdaftar",
        message: `${params.userName} (${params.email}) mendaftar sebagai Seller`,
        type: "user",
        referenceId: params.userId,
        referenceType: "user",
      });
    }
  }

  async onSuspiciousActivity(params: {
    tenantId: string;
    userId: string;
    userName: string;
    activityType: string;
    details: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Aktivitas Mencurigakan Terdeteksi",
      message: `${params.userName}: ${params.activityType} - ${params.details}`,
      type: "security",
      referenceId: params.userId,
      referenceType: "user",
    });
  }

  // === REPORTS & MODERATION EVENTS ===

  async onNewReportCreated(params: {
    tenantId: string;
    reporterId: string;
    reporterName: string;
    targetType: string;
    targetId: string;
    reason: string;
    reportId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Laporan Baru Masuk",
      message: `${params.reporterName} melaporkan ${params.targetType} dengan alasan: ${params.reason}`,
      type: "report",
      referenceId: params.reportId,
      referenceType: "report",
    });
  }

  async onReportStatusChanged(params: {
    tenantId: string;
    reporterId: string;
    reportId: string;
    newStatus: string;
    resolvedBy?: string;
  }) {
    // Notify reporter
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.reporterId,
      title: "Status Laporan Diperbarui",
      message: `Status laporan Anda berubah menjadi: ${params.newStatus}`,
      type: "report",
      referenceId: params.reportId,
      referenceType: "report",
    });
  }

  // === FINANCIAL & WITHDRAWAL EVENTS ===

  async onWithdrawalRequested(params: {
    tenantId: string;
    sellerId: string;
    sellerName: string;
    amount: number;
    withdrawalId: string;
    bankName?: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Permintaan Penarikan Dana",
      message: `${params.sellerName} mengajukan penarikan dana sebesar Rp ${params.amount.toLocaleString("id-ID")}${params.bankName ? ` ke ${params.bankName}` : ""}`,
      type: "withdrawal",
      referenceId: params.withdrawalId,
      referenceType: "withdrawal",
    });
  }

  async onWithdrawalProcessed(params: {
    tenantId: string;
    sellerId: string;
    amount: number;
    withdrawalId: string;
    status: "APPROVED" | "REJECTED";
    reason?: string;
  }) {
    // Notify seller
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.sellerId,
      title: params.status === "APPROVED" ? "Penarikan Dana Disetujui" : "Penarikan Dana Ditolak",
      message: params.status === "APPROVED"
        ? `Penarikan dana sebesar Rp ${params.amount.toLocaleString("id-ID")} telah disetujui dan sedang diproses`
        : `Penarikan dana sebesar Rp ${params.amount.toLocaleString("id-ID")} ditolak${params.reason ? `: ${params.reason}` : ""}`,
      type: "withdrawal",
      referenceId: params.withdrawalId,
      referenceType: "withdrawal",
    });
  }

  async onLargeTransaction(params: {
    tenantId: string;
    buyerId: string;
    sellerId: string;
    orderTitle: string;
    amount: number;
    orderId: string;
  }) {
    // Notify admin for transactions above 10 million (configurable threshold)
    const threshold = 10000000;
    if (params.amount >= threshold) {
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Transaksi Besar Terdeteksi",
        message: `Transaksi sebesar Rp ${params.amount.toLocaleString("id-ID")} untuk "${params.orderTitle}"`,
        type: "order",
        referenceId: params.orderId,
        referenceType: "order",
      });
    }
  }

  // === REVIEW & RATING EVENTS ===

  async onLowRatingReceived(params: {
    tenantId: string;
    receiverId: string;
    receiverName: string;
    giverName: string;
    rating: number;
    comment?: string;
    reviewId: string;
  }) {
    // Notify admin for low ratings (1-2 stars) - potential issue
    if (params.rating <= 2) {
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Rating Rendah Diterima",
        message: `${params.receiverName} menerima rating ${params.rating} bintang dari ${params.giverName}${params.comment ? `: "${params.comment.substring(0, 50)}..."` : ""}`,
        type: "review",
        referenceId: params.reviewId,
        referenceType: "review",
      });
    }
  }

  // === CHAT TRANSACTION EVENTS ===

  /**
   * Notify when a new chat transaction is created (buyer contacts seller/admin about product/service)
   * For internal products (platform tenant), notify all admins
   */
  async onNewChatTransaction(params: {
    tenantId: string;
    buyerId: string;
    buyerName: string;
    sellerId: string;
    transactionId: string;
    contextType: string;
    contextTitle: string;
    price?: number;
    quantity?: number;
  }) {
    // Check if this is a platform tenant (internal product/service)
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { subdomain: true },
    });

    const isPlatformTenant = tenant?.subdomain === "platform";

    if (isPlatformTenant) {
      // Notify all admins for internal products
      await this.notifyAdminRoles({
        tenantId: params.tenantId,
        title: "Pesanan Produk Internal Baru",
        message: `${params.buyerName} tertarik dengan ${params.contextType === "product" ? "produk" : "layanan"} "${params.contextTitle}"${params.price ? ` (Rp ${params.price.toLocaleString("id-ID")})` : ""}${params.quantity ? ` x${params.quantity}` : ""}`,
        type: "chat_transaction",
        referenceId: params.transactionId,
        referenceType: "chat_transaction",
      });
    } else {
      // Notify seller for regular products
      await this.createNotification({
        tenantId: params.tenantId,
        userId: params.sellerId,
        title: "Pesanan Baru via Chat",
        message: `${params.buyerName} tertarik dengan ${params.contextType === "product" ? "produk" : "layanan"} "${params.contextTitle}"${params.price ? ` (Rp ${params.price.toLocaleString("id-ID")})` : ""}`,
        type: "chat_transaction",
        referenceId: params.transactionId,
        referenceType: "chat_transaction",
      });
    }
  }

  /**
   * Notify buyer when transaction is marked as completed
   */
  async onTransactionCompleted(params: {
    tenantId: string;
    buyerId: string;
    transactionId: string;
    itemTitle: string;
  }) {
    await this.createNotification({
      tenantId: params.tenantId,
      userId: params.buyerId,
      title: "Transaksi Selesai",
      message: `Transaksi "${params.itemTitle}" telah selesai. Anda dapat memberikan ulasan sekarang.`,
      type: "transaction_completed",
      referenceId: params.transactionId,
      referenceType: "chat_transaction",
    });
  }

  /**
   * Notify admin when buyer gives review for internal product/service
   */
  async onInternalProductReview(params: {
    tenantId: string;
    buyerName: string;
    itemTitle: string;
    rating: number;
    reviewId: string;
  }) {
    await this.notifyAdminRoles({
      tenantId: params.tenantId,
      title: "Ulasan Produk Internal Baru",
      message: `${params.buyerName} memberikan rating ${params.rating} bintang untuk "${params.itemTitle}"`,
      type: "review",
      referenceId: params.reviewId,
      referenceType: "review",
    });
  }
}
