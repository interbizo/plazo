import { Module } from "@nestjs/common";
import { DatabaseModule } from "@modules/database/database.module";
import { AddressService } from "./address.service";
import { AddressController } from "./address.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService],
})
export class AddressModule {}
