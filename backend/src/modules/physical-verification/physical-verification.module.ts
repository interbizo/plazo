import { Module } from "@nestjs/common";
import { PhysicalVerificationController } from "./physical-verification.controller";
import { PhysicalVerificationService } from "./physical-verification.service";
import { DatabaseModule } from "../database/database.module";

@Module({
  imports: [DatabaseModule],
  controllers: [PhysicalVerificationController],
  providers: [PhysicalVerificationService],
  exports: [PhysicalVerificationService],
})
export class PhysicalVerificationModule {}
