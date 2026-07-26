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
import { CartService } from "./cart.service";
import {
  AddToCartDto,
  UpdateCartItemDto,
  CheckoutDto,
  DirectPurchaseDto,
} from "./cart.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UserRole } from "@prisma/client";

@Controller("cart")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@GetUser() user: any) {
    return this.cartService.getCart(user.id);
  }

  @Get("total")
  getCartTotal(@GetUser() user: any) {
    return this.cartService.getCartTotal(user.id);
  }

  @Post("items")
  addToCart(@GetUser() user: any, @Body() addToCartDto: AddToCartDto) {
    return this.cartService.addToCart(user.id, addToCartDto);
  }

  @Put("items/:itemId")
  updateCartItem(
    @GetUser() user: any,
    @Param("itemId") itemId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    return this.cartService.updateCartItem(user.id, itemId, updateCartItemDto);
  }

  @Delete("items/:itemId")
  removeCartItem(@GetUser() user: any, @Param("itemId") itemId: string) {
    return this.cartService.removeCartItem(user.id, itemId);
  }

  @Delete()
  clearCart(@GetUser() user: any) {
    return this.cartService.clearCart(user.id);
  }

  @Post("checkout")
  checkout(@GetUser() user: any, @Body() checkoutDto: CheckoutDto) {
    return this.cartService.checkout(user.id, checkoutDto);
  }

  @Post("direct-purchase")
  directPurchase(@GetUser() user: any, @Body() dto: DirectPurchaseDto) {
    return this.cartService.directPurchase(user.id, dto);
  }
}
