import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { PhysicalVerificationService } from "./physical-verification.service";
import {
  RequestPhysicalVerificationDto,
  ScheduleVisitDto,
  UploadVisitPhotosDto,
  ApproveVerificationDto,
  RejectVerificationDto,
  UploadCertificateDto,
  PhysicalVerificationStatus,
} from "./physical-verification.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/physical-verification")
@UseGuards(JwtAuthGuard)
export class PhysicalVerificationController {
  constructor(private verificationService: PhysicalVerificationService) {}

  // ============ SELLER ENDPOINTS ============

  @Get("eligibility")
  checkEligibility(@GetUser("id") userId: string) {
    return this.verificationService.checkEligibility(userId);
  }

  @Get("status")
  getVerificationStatus(@GetUser("id") userId: string) {
    return this.verificationService.getVerificationStatus(userId);
  }

  @Post("request")
  requestVerification(
    @GetUser("id") userId: string,
    @Body() dto: RequestPhysicalVerificationDto,
    @Req() req: any,
  ) {
    const ipAddress = req.ip || req.connection.remoteAddress;
    return this.verificationService.requestVerification(userId, dto, ipAddress);
  }

  @Get("certificate")
  getCertificate(@GetUser("id") userId: string) {
    return this.verificationService.getCertificate(userId);
  }

  // ============ ADMIN ENDPOINTS ============

  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllVerifications(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("status") status?: PhysicalVerificationStatus,
    @Query("search") search?: string,
  ) {
    return this.verificationService.getAllVerifications({
      page,
      limit,
      status,
      search,
    });
  }

  @Get("admin/stats")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getStatistics() {
    return this.verificationService.getStatistics();
  }

  @Get("admin/:id")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getVerificationById(@Param("id") id: string) {
    return this.verificationService.getVerificationById(id);
  }

  @Put("admin/:id/schedule")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  scheduleVisit(
    @Param("id") id: string,
    @Body() dto: ScheduleVisitDto,
    @GetUser("id") adminId: string,
  ) {
    return this.verificationService.scheduleVisit(id, dto, adminId);
  }

  @Put("admin/:id/photos")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  uploadVisitPhotos(
    @Param("id") id: string,
    @Body() dto: UploadVisitPhotosDto,
    @GetUser("id") adminId: string,
  ) {
    return this.verificationService.uploadVisitPhotos(id, dto, adminId);
  }

  @Put("admin/:id/approve")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approveVerification(
    @Param("id") id: string,
    @Body() dto: ApproveVerificationDto,
    @GetUser("id") adminId: string,
  ) {
    return this.verificationService.approveVerification(id, dto, adminId);
  }

  @Put("admin/:id/reject")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  rejectVerification(
    @Param("id") id: string,
    @Body() dto: RejectVerificationDto,
    @GetUser("id") adminId: string,
  ) {
    return this.verificationService.rejectVerification(id, dto, adminId);
  }

  @Post("admin/:id/certificate")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  uploadCertificate(
    @Param("id") id: string,
    @Body() dto: UploadCertificateDto,
    @GetUser("id") adminId: string,
  ) {
    return this.verificationService.uploadCertificate(id, dto, adminId);
  }
}
