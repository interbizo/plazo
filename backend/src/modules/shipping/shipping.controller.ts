import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  EstimateProductShippingDto,
  SearchShippingDestinationDto,
} from "./shipping.dto";
import { ShippingService } from "./shipping.service";

@Controller("api/shipping")
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get("destinations")
  async searchDestinations(@Query() query: SearchShippingDestinationDto) {
    const data = await this.shippingService.searchDestinations(
      query.search,
      query.limit,
      query.offset,
    );

    return { data };
  }

  @Post("estimate")
  async estimateProduct(@Body() dto: EstimateProductShippingDto) {
    const data = await this.shippingService.estimateProduct(dto);

    return { data };
  }
}