import {
  Injectable,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateProposalDto, UpdateProposalDto } from "./proposals.dto";
import { PaginationHelper } from "@common/utils/pagination.helper";
import { ProposalStatus, JobStatus } from "@prisma/client";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class ProposalsService {
  constructor(
    private prisma: PrismaService,
    private notifEvents: NotificationEventsService,
  ) {}

  /**
   * Submit Proposal (Seller only)
   */
  async submitProposal(
    tenantId: string | undefined,
    sellerId: string,
    createProposalDto: CreateProposalDto,
  ) {
    const { jobId } = createProposalDto;

    // Validate jobId format
    if (!jobId || typeof jobId !== 'string' || jobId.trim() === '') {
      throw new BadRequestException("Invalid job ID");
    }

    // Check job exists and get its tenantId
    const job = await this.prisma.job.findFirst({
      where: { 
        id: jobId.trim(), 
        deletedAt: null 
      },
    });

    if (!job) {
      throw new BadRequestException("Job not found or has been removed");
    }

    // Use the job's tenantId for the proposal
    const resolvedTenantId = job.tenantId;

    if (job.status !== JobStatus.OPEN && job.status !== JobStatus.IN_REVIEW) {
      throw new BadRequestException("Job is not accepting proposals");
    }

    // Check seller premium — hanya seller premium yang bisa kirim proposal
    const sellerTenant = await this.prisma.tenant.findFirst({
      where: { ownerId: sellerId, isActive: true, deletedAt: null },
      select: { subscriptionPlan: true, sellerTier: true },
    });

    if (!sellerTenant || sellerTenant.sellerTier === "FREE") {
      throw new BadRequestException(
        "Hanya seller premium yang bisa mengirim proposal. Silakan upgrade paket Anda.",
      );
    }

    // Check if seller already submitted proposal
    const existingProposal = await this.prisma.proposal.findUnique({
      where: { jobId_sellerId: { jobId, sellerId } },
    });

    if (existingProposal) {
      throw new ConflictException(
        "You already submitted a proposal for this job",
      );
    }

    const currentProposalCount = await this.prisma.proposal.count({
      where: { jobId, deletedAt: null },
    });

    if (
      job.maxProposals !== null &&
      job.maxProposals !== undefined &&
      currentProposalCount >= job.maxProposals
    ) {
      if (job.status === JobStatus.OPEN) {
        await this.prisma.job.update({
          where: { id: job.id },
          data: { status: JobStatus.IN_REVIEW },
        });
      }

      throw new BadRequestException(
        "Batas proposal untuk lowongan ini sudah terpenuhi.",
      );
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        jobId,
        sellerId,
        bidPrice: createProposalDto.bidPrice,
        message: createProposalDto.message,
        attachments: createProposalDto.attachments || [],
        status: ProposalStatus.PENDING,
      },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        job: {
          select: {
            id: true,
            title: true,
            budget: true,
            buyerId: true,
            tenantId: true,
          },
        },
      },
    });

    // Auto notification
    await this.notifEvents.onProposalSubmitted({
      tenantId: proposal.job.tenantId,
      buyerId: proposal.job.buyerId,
      sellerName: `${proposal.seller.firstName} ${proposal.seller.lastName}`,
      jobTitle: proposal.job.title,
      jobId: proposal.job.id,
      proposalId: proposal.id,
    });

    if (
      job.maxProposals !== null &&
      job.maxProposals !== undefined &&
      currentProposalCount + 1 >= job.maxProposals &&
      job.status === JobStatus.OPEN
    ) {
      await this.prisma.job.update({
        where: { id: job.id },
        data: { status: JobStatus.IN_REVIEW },
      });
    }

    return {
      message: "Proposal submitted successfully",
      proposal,
    };
  }

  /**
   * Get Proposals for Job
   */
  async getJobProposals(
    tenantId: string | undefined,
    jobId: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 10,
    status?: ProposalStatus,
  ) {
    // Check job exists
    const job = await this.prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
    });

    if (!job) {
      throw new BadRequestException("Job not found");
    }

    // Only job owner or admin can see all proposals with bid prices
    const isJobOwner = job.buyerId === userId;
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    if (!isJobOwner && !isAdmin) {
      throw new BadRequestException("Only the job poster can view proposals");
    }

    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where = {
      jobId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        include: {
          seller: {
            select: { 
              id: true, 
              firstName: true, 
              lastName: true, 
              avatar: true,
              sellerProfile: {
                select: {
                  portfolio: true,
                  portfolioFiles: true,
                  bio: true,
                  skills: true,
                  averageRating: true,
                  totalReviews: true,
                }
              }
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    // Parse portfolio JSON string to array
    const proposalsWithParsedPortfolio = proposals.map(proposal => {
      if (proposal.seller?.sellerProfile?.portfolio) {
        try {
          const portfolioItems = JSON.parse(proposal.seller.sellerProfile.portfolio);
          return {
            ...proposal,
            seller: {
              ...proposal.seller,
              sellerProfile: {
                ...proposal.seller.sellerProfile,
                portfolio: portfolioItems,
              }
            }
          };
        } catch {
          return {
            ...proposal,
            seller: {
              ...proposal.seller,
              sellerProfile: {
                ...proposal.seller.sellerProfile,
                portfolio: [],
              }
            }
          };
        }
      }
      return proposal;
    });

    return PaginationHelper.formatPaginatedResponse(
      proposalsWithParsedPortfolio,
      total,
      page,
      limit,
    );
  }

  /**
   * Get Seller's Proposals
   */
  async getSellerProposals(
    tenantId: string | undefined,
    sellerId: string,
    page: number = 1,
    limit: number = 10,
    status?: ProposalStatus,
  ) {
    const { skip, take } = PaginationHelper.calculatePagination(page, limit);

    const where = {
      sellerId,
      deletedAt: null,
      ...(status && { status }),
    };

    const [proposals, total] = await Promise.all([
      this.prisma.proposal.findMany({
        where,
        skip,
        take,
        include: {
          job: {
            select: { id: true, title: true, budget: true, buyer: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.proposal.count({ where }),
    ]);

    return PaginationHelper.formatPaginatedResponse(
      proposals,
      total,
      page,
      limit,
    );
  }

  /**
   * Accept Proposal (Buyer only)
   */
  async acceptProposal(tenantId: string | undefined, proposalId: string, buyerId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { job: true },
    });

    if (!proposal) {
      throw new BadRequestException("Proposal not found");
    }

    if (proposal.job.buyerId !== buyerId) {
      throw new BadRequestException("You are not the job owner");
    }

    // Use the job's tenantId for the order
    const resolvedTenantId = proposal.job.tenantId;

    // Update proposal status
    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.ACCEPTED },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        job: true,
      },
    });

    // Update job status
    await this.prisma.job.update({
      where: { id: proposal.jobId },
      data: { status: JobStatus.HIRED },
    });

    // Reject other proposals
    await this.prisma.proposal.updateMany({
      where: {
        jobId: proposal.jobId,
        id: { not: proposalId },
        status: ProposalStatus.PENDING,
      },
      data: { status: ProposalStatus.REJECTED },
    });

    // Auto-create order from accepted proposal
    const order = await this.prisma.order.create({
      data: {
        tenantId: resolvedTenantId,
        buyerId,
        sellerId: updated.sellerId,
        jobId: updated.jobId,
        proposalId: updated.id,
        title: `Order: ${updated.job.title}`,
        description: updated.message,
        amount: updated.bidPrice,
        status: "PENDING",
        escrowAmount: updated.bidPrice,
      },
    });

    // Create escrow transaction
    await this.prisma.transaction.create({
      data: {
        userId: buyerId,
        type: "ESCROW_HOLD",
        amount: updated.bidPrice,
        fee: 0,
        netAmount: updated.bidPrice,
        status: "COMPLETED",
        orderId: order.id,
        description: `Escrow hold for job: ${updated.job.title}`,
      },
    });

    // Create chat room
    await this.prisma.chatRoom.create({
      data: {
        tenantId: resolvedTenantId,
        orderId: order.id,
        participants: {
          connect: [{ id: buyerId }, { id: updated.sellerId }],
        },
      },
    });

    // Auto notification
    await this.notifEvents.onProposalAccepted({
      tenantId: updated.job.tenantId,
      sellerId: updated.sellerId,
      sellerEmail: updated.seller.email,
      jobTitle: updated.job.title,
      jobId: updated.jobId,
      proposalId: updated.id,
    });

    return {
      message: "Proposal accepted and order created",
      proposal: updated,
      order,
    };
  }

  /**
   * Reject Proposal (Buyer only)
   */
  async rejectProposal(tenantId: string | undefined, proposalId: string, buyerId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { job: true, seller: { select: { id: true, email: true } } },
    });

    if (!proposal) {
      throw new BadRequestException("Proposal not found");
    }

    if (proposal.job.buyerId !== buyerId) {
      throw new BadRequestException("You are not the job owner");
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: ProposalStatus.REJECTED },
    });

    // Auto notification
    await this.notifEvents.onProposalRejected({
      tenantId: proposal.job.tenantId,
      sellerId: proposal.sellerId,
      sellerEmail: proposal.seller.email,
      jobTitle: proposal.job.title,
      proposalId: proposal.id,
    });

    return {
      message: "Proposal rejected",
      proposal: updated,
    };
  }

  /**
   * Update Proposal (Seller only, before acceptance)
   */
  async updateProposal(
    tenantId: string | undefined,
    proposalId: string,
    sellerId: string,
    updateProposalDto: UpdateProposalDto,
  ) {
    const proposal = await this.prisma.proposal.findFirst({
      where: {
        id: proposalId,
        sellerId,
        status: ProposalStatus.PENDING,
      },
      include: { job: true },
    });

    if (!proposal) {
      throw new BadRequestException("Proposal not found or cannot be edited");
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: updateProposalDto,
    });

    return {
      message: "Proposal updated successfully",
      proposal: updated,
    };
  }
}
