import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import {
  ArticleCategoriesAdminController,
  ArticleCategoriesPublicController,
  ArticlesAdminController,
  ArticlesPublicController,
} from "./articles.controller";
import { ArticlesService } from "./articles.service";

@Module({
  imports: [DatabaseModule],
  controllers: [
    ArticlesAdminController,
    ArticleCategoriesAdminController,
    ArticlesPublicController,
    ArticleCategoriesPublicController,
  ],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
