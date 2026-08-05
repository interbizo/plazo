import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import {
  ForumMemberController,
  ForumModerationController,
  ForumPublicController,
} from "./forum.controller";
import { ForumService } from "./forum.service";

@Module({
  imports: [DatabaseModule],
  controllers: [ForumPublicController, ForumMemberController, ForumModerationController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
