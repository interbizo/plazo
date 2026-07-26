import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { RecommendedToolsService } from "./recommended-tools.service";
import { RecommendedToolsController } from "./recommended-tools.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [RecommendedToolsController],
  providers: [RecommendedToolsService],
  exports: [RecommendedToolsService],
})
export class RecommendedToolsModule {}
