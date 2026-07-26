import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { TutorialService } from "./tutorial.service";
import { 
  CreateTutorialDto, 
  UpdateTutorialDto, 
  TutorialCategory, 
  TutorialTargetRole,
  GetTutorialsQueryDto,
  GetFeaturedTutorialsQueryDto,
} from "./tutorial.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/tutorials")
export class TutorialController {
  constructor(private tutorialService: TutorialService) {}

  // ============ PUBLIC ENDPOINTS ============

  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getPublicTutorials(@Query() query: GetTutorialsQueryDto) {
    return this.tutorialService.getPublicTutorials(query);
  }

  @Get("featured")
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  getFeaturedTutorials(@Query() query: GetFeaturedTutorialsQueryDto) {
    return this.tutorialService.getFeaturedTutorials(query.targetRole);
  }

  @Get("slug/:slug")
  getPublicTutorialBySlug(@Param("slug") slug: string) {
    return this.tutorialService.getPublicTutorialBySlug(slug);
  }

  // ============ ADMIN ENDPOINTS ============

  @Get("admin/all")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAllTutorials(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("category") category?: TutorialCategory,
    @Query("targetRole") targetRole?: TutorialTargetRole,
    @Query("isPublished") isPublished?: boolean,
    @Query("search") search?: string,
  ) {
    return this.tutorialService.getAllTutorials({
      page,
      limit,
      category,
      targetRole,
      isPublished,
      search,
    });
  }

  @Get("admin/stats")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTutorialStats() {
    return this.tutorialService.getTutorialStats();
  }

  @Get("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getTutorialById(@Param("id") id: string) {
    return this.tutorialService.getTutorialById(id);
  }

  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  createTutorial(@Body() dto: CreateTutorialDto) {
    return this.tutorialService.createTutorial(dto);
  }

  @Put("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateTutorial(@Param("id") id: string, @Body() dto: UpdateTutorialDto) {
    return this.tutorialService.updateTutorial(id, dto);
  }

  @Delete("admin/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  deleteTutorial(@Param("id") id: string) {
    return this.tutorialService.deleteTutorial(id);
  }
}
