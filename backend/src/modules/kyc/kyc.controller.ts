import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { KycService } from "./kyc.service";
import { SubmitKycDto, AdminReviewKycDto } from "./kyc.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";
import { Request } from "express";

@Controller("api/kyc")
export class KycController {
  constructor(private kycService: KycService) {}

  @Post("submit")
  @UseGuards(JwtAuthGuard)
  submitKyc(
    @GetUser("id") userId: string,
    @Body() dto: SubmitKycDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip;
    return this.kycService.submitKyc(userId, dto, ip);
  }

  @Get("status")
  @UseGuards(JwtAuthGuard)
  getKycStatus(@GetUser("id") userId: string) {
    return this.kycService.getKycStatus(userId);
  }

  // Admin endpoints
  @Get("admin/submissions")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listSubmissions(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
  ) {
    return this.kycService.listKycSubmissions(page, limit, status);
  }

  @Put("admin/submissions/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reviewKyc(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
    @Body() dto: AdminReviewKycDto,
  ) {
    return this.kycService.reviewKyc(id, adminId, dto);
  }
}
