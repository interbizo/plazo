import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { AddressService } from "./address.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GetUser } from "@common/decorators/get-user.decorator";

@Controller("api/addresses")
@UseGuards(JwtAuthGuard)
export class AddressController {
  constructor(private addressService: AddressService) {}

  @Get()
  getMyAddresses(@GetUser("id") userId: string) {
    return this.addressService.getUserAddresses(userId);
  }

  @Get("default")
  getDefaultAddress(@GetUser("id") userId: string) {
    return this.addressService.getDefaultAddress(userId);
  }

  @Post()
  createAddress(
    @GetUser("id") userId: string,
    @Body()
    body: {
      label: string;
      name: string;
      phone: string;
      address: string;
      province: string;
      provinceId?: string;
      city: string;
      cityId?: string;
      district: string;
      districtId?: string;
      postalCode: string;
      isDefault?: boolean;
    },
  ) {
    return this.addressService.createAddress(userId, body);
  }

  @Put(":id")
  updateAddress(
    @GetUser("id") userId: string,
    @Param("id") addressId: string,
    @Body() body: any,
  ) {
    return this.addressService.updateAddress(userId, addressId, body);
  }

  @Delete(":id")
  deleteAddress(
    @GetUser("id") userId: string,
    @Param("id") addressId: string,
  ) {
    return this.addressService.deleteAddress(userId, addressId);
  }

  @Post(":id/set-default")
  setDefault(
    @GetUser("id") userId: string,
    @Param("id") addressId: string,
  ) {
    return this.addressService.setDefaultAddress(userId, addressId);
  }
}
