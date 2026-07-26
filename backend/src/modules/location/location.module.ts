import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { LocationService } from "./location.service";
import { LocationController } from "./location.controller";

@Module({
  imports: [DatabaseModule],
  providers: [LocationService],
  controllers: [LocationController],
  exports: [LocationService],
})
export class LocationModule {}
