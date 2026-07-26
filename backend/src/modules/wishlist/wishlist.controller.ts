import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { WishlistService } from "./wishlist.service";
import { AddWishlistDto } from "./wishlist.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GetUser } from "@common/decorators/get-user.decorator";

@Controller("api/wishlist")
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Post()
  addToWishlist(@GetUser("id") userId: string, @Body() dto: AddWishlistDto) {
    return this.wishlistService.addToWishlist(userId, dto);
  }

  @Get()
  getWishlist(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
  ) {
    return this.wishlistService.getWishlist(userId, page, limit);
  }

  @Delete(":id")
  removeFromWishlist(
    @GetUser("id") userId: string,
    @Param("id") wishlistId: string,
  ) {
    return this.wishlistService.removeFromWishlist(userId, wishlistId);
  }

  @Delete()
  removeFromWishlistByTarget(
    @GetUser("id") userId: string,
    @Body() dto: AddWishlistDto,
  ) {
    return this.wishlistService.removeFromWishlistByTarget(userId, dto);
  }

  @Get("check")
  isInWishlist(
    @GetUser("id") userId: string,
    @Query("productId") productId?: string,
    @Query("serviceId") serviceId?: string,
  ) {
    if (serviceId) {
      return this.wishlistService.isServiceInWishlist(userId, serviceId);
    }
    if (productId) {
      return this.wishlistService.isInWishlist(userId, productId);
    }
    return { isInWishlist: false };
  }

  @Get("check/:productId")
  isInWishlistByParam(
    @GetUser("id") userId: string,
    @Param("productId") productId: string,
  ) {
    return this.wishlistService.isInWishlist(userId, productId);
  }

  @Get("check-service/:serviceId")
  isServiceInWishlist(
    @GetUser("id") userId: string,
    @Param("serviceId") serviceId: string,
  ) {
    return this.wishlistService.isServiceInWishlist(userId, serviceId);
  }
}
