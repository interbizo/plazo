import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import {
  ForumMemberController,
  ForumModerationController,
  ForumPublicController,
} from "./forum.controller";
import { ForumService } from "./forum.service";
import { FeatureFlagGuard } from "@common/guards/feature-flag.guard";

@Module({
  imports: [DatabaseModule],
  controllers: [ForumPublicController, ForumMemberController, ForumModerationController],
  providers: [ForumService, FeatureFlagGuard],
  exports: [ForumService],
})
export class ForumModule {}
