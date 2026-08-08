import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { memoryStorage } from "multer";
import { UserRole } from "@prisma/client";
import { GetUser } from "@common/decorators/get-user.decorator";
import { Roles } from "@common/decorators/roles.decorator";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { FeatureFlagGuard } from "@common/guards/feature-flag.guard";
import { RequireFeatureFlag } from "@common/decorators/require-feature-flag.decorator";
import { ArticlesService } from "./articles.service";
import {
  ArticleListQueryDto,
  CreateArticleCategoryDto,
  CreateArticleDto,
  PublicArticleListQueryDto,
  UpdateArticleCategoryDto,
  UpdateArticleDto,
} from "./articles.dto";

@Controller("api/admin/articles")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@RequireFeatureFlag('module.article')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ArticlesAdminController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  listArticles(@Query() query: ArticleListQueryDto) {
    return this.articlesService.listAdmin(query);
  }

  @Get(":id")
  getArticle(@Param("id") id: string) {
    return this.articlesService.getAdminArticle(id);
  }

  @Post()
  createArticle(@Body() dto: CreateArticleDto, @GetUser("id") userId: string) {
    return this.articlesService.createArticle(dto, userId);
  }

  @Put(":id")
  updateArticle(@Param("id") id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.updateArticle(id, dto);
  }

  @Post(":id/publish")
  publishArticle(@Param("id") id: string) {
    return this.articlesService.publishArticle(id);
  }

  @Post(":id/unpublish")
  unpublishArticle(@Param("id") id: string) {
    return this.articlesService.unpublishArticle(id);
  }

  @Delete(":id")
  deleteArticle(@Param("id") id: string) {
    return this.articlesService.deleteArticle(id);
  }

  @Post("import-csv")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  importCsv(
    @UploadedFile() file: Express.Multer.File,
    @GetUser("id") userId: string,
  ) {
    return this.articlesService.importCsv(file, userId);
  }
}

@Controller("api/admin/article-categories")
@UseGuards(JwtAuthGuard, RolesGuard, FeatureFlagGuard)
@RequireFeatureFlag('module.article')
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ArticleCategoriesAdminController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  listCategories() {
    return this.articlesService.listCategoriesAdmin();
  }

  @Post()
  createCategory(@Body() dto: CreateArticleCategoryDto) {
    return this.articlesService.createCategory(dto);
  }

  @Put(":id")
  updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateArticleCategoryDto,
  ) {
    return this.articlesService.updateCategory(id, dto);
  }

  @Delete(":id")
  deleteCategory(@Param("id") id: string) {
    return this.articlesService.deleteCategory(id);
  }
}

@UseGuards(FeatureFlagGuard)
@RequireFeatureFlag('module.article')
@Controller("api/public/articles")
export class ArticlesPublicController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  listArticles(@Query() query: PublicArticleListQueryDto) {
    return this.articlesService.listPublic(query);
  }

  @Post(":id/view")
  trackArticleView(
    @Param("id") id: string,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || ip;
    const userId = (req as any).user?.id;

    return this.articlesService.trackArticleView(id, clientIp, userId);
  }

  @Get(":slug")
  getArticle(@Param("slug") slug: string) {
    return this.articlesService.getPublicArticleBySlug(slug);
  }
}

@UseGuards(FeatureFlagGuard)
@RequireFeatureFlag('module.article')
@Controller("api/public/article-categories")
export class ArticleCategoriesPublicController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  listCategories() {
    return this.articlesService.listCategoriesPublic();
  }
}
