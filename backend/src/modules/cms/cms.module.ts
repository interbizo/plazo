import { Module } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsAdminController, CmsPublicController } from "./cms.controller";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  providers: [CmsService],
  controllers: [CmsAdminController, CmsPublicController],
  exports: [CmsService],
})
export class CmsModule {}
