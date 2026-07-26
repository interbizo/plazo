import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateReportDto, AdminResolveReportDto, CreateReportMessageDto } from "./reports.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { ReportsGateway } from "./reports.gateway";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ReportsGateway))
    private reportsGateway: ReportsGateway,
    private notificationEvents: NotificationEventsService,
  ) {}

  async createReport(reporterId: string, dto: CreateReportDto) {
    // Prevent self-reporting
    if (dto.targetUserId === reporterId) {
      throw new BadRequestException("Cannot report yourself");
    }

    // Check duplicate report for specific targets
    if (dto.targetId && dto.targetId !== "GENERAL") {
      const existing = await this.prisma.report.findFirst({
        where: {
          reporterId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          status: { in: ["PENDING", "REVIEWING"] },
        },
      });
      if (existing) {
        throw new BadRequestException("You already reported this");
      }
    }

    // For GENERAL reports, check if user created a similar report in the last 5 minutes
    if (dto.targetId === "GENERAL" || !dto.targetId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentReport = await this.prisma.report.findFirst({
        where: {
          reporterId,
          targetType: dto.targetType,
          targetId: "GENERAL",
          reason: dto.reason,
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
      });
      
      if (recentReport) {
        throw new BadRequestException("You recently submitted a similar report. Please wait a few minutes before submitting again.");
      }
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId || "GENERAL",
        targetUserId: dto.targetUserId,
        reason: dto.reason,
        description: dto.description,
        evidence: dto.evidence || [],
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create welcome message automatically
    await this.prisma.reportMessage.create({
      data: {
        reportId: report.id,
        senderId: reporterId,
        message: dto.description || "Laporan telah dibuat",
        isAdmin: false,
      },
    });

    return { message: "Report submitted", report };
  }

  async getMyReports(userId: string, page = 1, limit = 10) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where = { reporterId: userId };

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        include: {
          reporter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      reports,
      total,
      page,
      limit,
    );
  }

  async getReportById(reportId: string, userId: string, isAdmin: boolean) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!report) throw new NotFoundException("Report not found");

    // Check access: only reporter or admin can view
    if (!isAdmin && report.reporterId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    return report;
  }

  async getReportMessages(reportId: string, userId: string, isAdmin: boolean) {
    // Verify access
    const report = await this.getReportById(reportId, userId, isAdmin);

    const messages = await this.prisma.reportMessage.findMany({
      where: { reportId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return { report, messages };
  }

  async createReportMessage(
    reportId: string,
    userId: string,
    dto: CreateReportMessageDto,
    isAdmin: boolean,
  ) {
    // Verify access
    const report = await this.getReportById(reportId, userId, isAdmin);

    const message = await this.prisma.reportMessage.create({
      data: {
        reportId,
        senderId: userId,
        message: dto.message,
        isAdmin,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true,
          },
        },
      },
    });

    // Send notification to reporter when admin replies
    if (isAdmin && report.reporterId !== userId) {
      try {
        await this.notificationEvents.notifyReportReply(
          report.reporterId,
          reportId,
          message.sender.firstName || "Admin",
          dto.message,
        );
      } catch (error) {
        // Log error but don't fail the message creation
        console.error("Failed to send report reply notification:", error);
      }
    }

    return message;
  }

  // Admin
  async listReports(page = 1, limit = 20, status?: string) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);
    const where: any = status ? { status } : {};

    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
          },
          targetUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.report.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      reports,
      total,
      page,
      limit,
    );
  }

  async resolveReport(
    reportId: string,
    adminId: string,
    dto: AdminResolveReportDto,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException("Report not found");
    if (report.status !== "PENDING" && report.status !== "REVIEWING")
      throw new BadRequestException("Report already resolved");

    const newStatus = dto.action === "resolve" ? "RESOLVED" : "DISMISSED";

    await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        adminNotes: dto.adminNotes,
        resolvedBy: adminId,
        resolvedAt: new Date(),
      },
    });

    // Notify via WebSocket
    this.reportsGateway.notifyReportStatusChange(reportId, newStatus);

    return { message: `Report ${newStatus.toLowerCase()}` };
  }
}
