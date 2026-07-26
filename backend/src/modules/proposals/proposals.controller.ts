import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { CreateProposalDto, UpdateProposalDto } from "./proposals.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { RequireSellerTier } from "@common/decorators/seller-tier.decorator";
import { SellerTierGuard } from "@common/guards/seller-tier.guard";
import { ProposalStatus, SellerTier, UserRole } from "@prisma/client";

@Controller("api/proposals")
export class ProposalsController {
  constructor(private proposalsService: ProposalsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SellerTierGuard)
  @Roles(UserRole.SELLER)
  @RequireSellerTier(SellerTier.MEMBER)
  async submitProposal(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Body() createProposalDto: CreateProposalDto,
  ) {
    return this.proposalsService.submitProposal(
      tenantId,
      userId,
      createProposalDto,
    );
  }

  @Get("job/:jobId")
  @UseGuards(JwtAuthGuard)
  async getJobProposals(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @GetUser("role") userRole: string,
    @Param("jobId") jobId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: ProposalStatus,
  ) {
    return this.proposalsService.getJobProposals(
      tenantId,
      jobId,
      userId,
      userRole,
      page,
      limit,
      status,
    );
  }

  @Get("seller/my-proposals")
  @UseGuards(JwtAuthGuard)
  async getSellerProposals(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: ProposalStatus,
  ) {
    return this.proposalsService.getSellerProposals(
      tenantId,
      userId,
      page,
      limit,
      status,
    );
  }

  @Post(":id/accept")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async acceptProposal(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") proposalId: string,
  ) {
    return this.proposalsService.acceptProposal(tenantId, proposalId, userId);
  }

  @Post(":id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async rejectProposal(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") proposalId: string,
  ) {
    return this.proposalsService.rejectProposal(tenantId, proposalId, userId);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  async updateProposal(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") proposalId: string,
    @Body() updateProposalDto: UpdateProposalDto,
  ) {
    return this.proposalsService.updateProposal(
      tenantId,
      proposalId,
      userId,
      updateProposalDto,
    );
  }
}
