import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common";
import { SellerLevelsService } from "./seller-levels.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("api/seller-levels")
export class SellerLevelsController {
  constructor(private service: SellerLevelsService) {}

  @Get("my-level")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getMyLevel(@GetUser("id") userId: string) {
    return this.service.evaluateSellerLevel(userId);
  }

  @Get(":userId/badge")
  getSellerBadge(@Param("userId") userId: string) {
    return this.service.getSellerBadge(userId);
  }

  @Post("evaluate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  evaluateLevel(@GetUser("id") userId: string) {
    return this.service.evaluateSellerLevel(userId);
  }
}
