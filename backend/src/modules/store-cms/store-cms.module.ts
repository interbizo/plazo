import { Module } from "@nestjs/common";
import { StoreCmsController } from "./store-cms.controller";
import { StoreCmsService } from "./store-cms.service";
import { DatabaseModule } from "@modules/database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [StoreCmsController],
  providers: [StoreCmsService],
  exports: [StoreCmsService],
})
export class StoreCmsModule {}
