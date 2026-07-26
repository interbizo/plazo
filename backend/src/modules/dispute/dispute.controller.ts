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
import { DisputeService } from "./dispute.service";
import { CreateDisputeDto, ResolveDisputeDto } from "./dispute.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole, DisputeStatus } from "@prisma/client";

@Controller("api/disputes")
export class DisputeController {
  constructor(private disputeService: DisputeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createDispute(@GetUser("id") userId: string, @Body() dto: CreateDisputeDto) {
    return this.disputeService.openDispute(userId, dto);
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  getUserDisputes(@GetUser("id") userId: string) {
    return this.disputeService.getUserDisputes(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getDisputes(
    @GetUser("id") adminId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: DisputeStatus,
  ) {
    return this.disputeService.getAllDisputes(adminId, page, limit, status);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getDispute(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.disputeService.getDispute(id, userId);
  }

  @Put(":id/resolve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resolveDispute(
    @GetUser("id") adminId: string,
    @Param("id") id: string,
    @Body() dto: ResolveDisputeDto,
  ) {
    return this.disputeService.resolveDispute(id, adminId, dto);
  }
}
