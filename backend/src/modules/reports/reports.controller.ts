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
import { ReportsService } from "./reports.service";
import { CreateReportDto, AdminResolveReportDto, CreateReportMessageDto } from "./reports.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/reports")
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  createReport(@GetUser("id") userId: string, @Body() dto: CreateReportDto) {
    return this.reportsService.createReport(userId, dto);
  }

  @Get("my-reports")
  getMyReports(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.reportsService.getMyReports(userId, page, limit);
  }

  @Get(":id")
  async getReportById(
    @Param("id") id: string,
    @GetUser("id") userId: string,
    @GetUser("role") role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const report = await this.reportsService.getReportById(id, userId, isAdmin);
    return { data: report };
  }

  @Get(":id/messages")
  async getReportMessages(
    @Param("id") id: string,
    @GetUser("id") userId: string,
    @GetUser("role") role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const result = await this.reportsService.getReportMessages(id, userId, isAdmin);
    return { data: result };
  }

  @Post(":id/messages")
  async createReportMessage(
    @Param("id") id: string,
    @GetUser("id") userId: string,
    @GetUser("role") role: UserRole,
    @Body() dto: CreateReportMessageDto,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
    const message = await this.reportsService.createReportMessage(id, userId, dto, isAdmin);
    return { data: message };
  }

  // Admin
  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  listReports(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("status") status?: string,
  ) {
    return this.reportsService.listReports(page, limit, status);
  }

  @Put("admin/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resolveReport(
    @Param("id") id: string,
    @GetUser("id") adminId: string,
    @Body() dto: AdminResolveReportDto,
  ) {
    return this.reportsService.resolveReport(id, adminId, dto);
  }
}
