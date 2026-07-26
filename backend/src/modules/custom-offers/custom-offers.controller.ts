import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CustomOffersService } from "./custom-offers.service";
import { CreateCustomOfferDto } from "./custom-offers.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/offers")
export class CustomOffersController {
  constructor(private offersService: CustomOffersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  createOffer(
    @GetUser("id") userId: string,
    @Body() dto: CreateCustomOfferDto,
  ) {
    return this.offersService.createOffer(userId, dto);
  }

  @Get("sent")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getSentOffers(@GetUser("id") userId: string) {
    return this.offersService.getMyOffers(userId, "seller");
  }

  @Get("received")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  getReceivedOffers(@GetUser("id") userId: string) {
    return this.offersService.getMyOffers(userId, "buyer");
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getOfferDetail(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.offersService.getOfferDetail(id, userId);
  }

  @Post(":id/accept")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  acceptOffer(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.offersService.acceptOffer(id, userId);
  }

  @Post(":id/decline")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  declineOffer(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.offersService.declineOffer(id, userId);
  }
}
