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
import { AccountAppealService } from "./account-appeal.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/account-appeal")
export class AccountAppealController {
  constructor(private appealService: AccountAppealService) {}

  // ============ USER ENDPOINTS ============

  @Post("submit")
  @UseGuards(JwtAuthGuard)
  submitAppeal(
    @GetUser("id") userId: string,
    @Body() body: { reason: string; evidence?: string },
  ) {
    return this.appealService.submitAppeal(userId, body.reason, body.evidence);
  }

  @Get("my-appeals")
  @UseGuards(JwtAuthGuard)
  getMyAppeals(@GetUser("id") userId: string) {
    return this.appealService.getUserAppeals(userId);
  }

  // ============ ADMIN ENDPOINTS ============

  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listAppeals(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
  ) {
    return this.appealService.listAppeals(page, limit, status);
  }

  @Put("admin/:id/approve")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  approveAppeal(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.appealService.approveAppeal(id, adminId, body.adminNote);
  }

  @Put("admin/:id/reject")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  rejectAppeal(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
    @Body() body: { adminNote?: string },
  ) {
    return this.appealService.rejectAppeal(id, adminId, body.adminNote);
  }

  @Post("admin/suspend/:userId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  suspendUser(
    @Param("userId") userId: string,
    @GetUser("id") adminId: string,
    @Body() body: { reason: string },
  ) {
    return this.appealService.suspendUser(userId, adminId, body.reason);
  }
}
