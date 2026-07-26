import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JobsService } from "./jobs.service";
import { CreateJobDto, UpdateJobDto } from "./jobs.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { JobStatus, UserRole } from "@prisma/client";

@Controller("api/jobs")
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async createJob(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Body() createJobDto: CreateJobDto,
  ) {
    return this.jobsService.createJob(tenantId, userId, createJobDto);
  }

  @Get()
  async getJobs(
    @GetTenant("id") tenantId: string | undefined,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: JobStatus,
    @Query("search") search?: string,
    @Query("city") city?: string,
  ) {
    return this.jobsService.getJobs(tenantId, page, limit, status, search, city);
  }

  @Get("by-slug/:slug")
  async getJobBySlug(
    @GetTenant("id") tenantId: string | undefined,
    @Param("slug") slug: string,
  ) {
    return this.jobsService.getJobBySlug(tenantId, slug);
  }

  @Get(":id")
  async getJob(@GetTenant("id") tenantId: string | undefined, @Param("id") jobId: string) {
    return this.jobsService.getJob(tenantId, jobId);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async updateJob(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") jobId: string,
    @Body() updateJobDto: UpdateJobDto,
  ) {
    return this.jobsService.updateJob(tenantId, jobId, userId, updateJobDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async deleteJob(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") jobId: string,
  ) {
    return this.jobsService.deleteJob(tenantId, jobId, userId);
  }

  @Post(":id/boost")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  async boostJob(
    @GetTenant("id") tenantId: string | undefined,
    @GetUser("id") userId: string,
    @Param("id") jobId: string,
    @Query("days") days: number = 7,
  ) {
    return this.jobsService.boostJob(tenantId, jobId, userId, days);
  }
}
