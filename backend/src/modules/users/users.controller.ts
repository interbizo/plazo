import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./users.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  getProfile(@GetUser() user: any) {
    return this.usersService.getUserById(user.id);
  }

  @Put("me")
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @GetUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get("search")
  @UseGuards(JwtAuthGuard)
  searchUsers(@Query("q") query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getUserById(@Param("id") id: string) {
    return this.usersService.getUserPublicProfile(id);
  }

  @Get(":id/seller-stats")
  getSellerStats(@Param("id") id: string) {
    return this.usersService.getSellerStats(id);
  }
}
