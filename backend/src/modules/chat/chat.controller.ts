import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { OpenChatRoomDto, SendMessageDto } from "./chat.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";

@Controller("api/chat")
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get("rooms")
  async getChatRooms(
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
  ) {
    return this.chatService.getChatRooms(userId, +page, +limit);
  }

  @Get("room/:roomId/messages")
  async getMessages(
    @GetUser("id") userId: string,
    @Param("roomId") roomId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
  ) {
    return this.chatService.getMessages(userId, roomId, +page, +limit);
  }

  @Post("send")
  async sendMessage(
    @GetUser("id") userId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Post("open")
  async openRoom(
    @GetUser("id") userId: string,
    @Body() openChatRoomDto: OpenChatRoomDto,
  ) {
    return this.chatService.openOrCreateRoom(userId, openChatRoomDto);
  }

  @Post("room/:roomId/mark-read")
  async markAsRead(
    @GetUser("id") userId: string,
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.markAsRead(userId, roomId);
  }

  @Post("transaction/:id/complete")
  @UseGuards(JwtAuthGuard)
  markTransactionComplete(
    @GetUser("id") userId: string,
    @Param("id") transactionId: string,
  ) {
    return this.chatService.markTransactionComplete(userId, transactionId);
  }

  @Get("room/:roomId/transactions")
  @UseGuards(JwtAuthGuard)
  getRoomTransactions(
    @GetUser("id") userId: string,
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.getRoomTransactions(userId, roomId);
  }

  @Get("transactions/completed")
  @UseGuards(JwtAuthGuard)
  getCompletedTransactions(@GetUser("id") userId: string) {
    return this.chatService.getCompletedTransactionsForBuyer(userId);
  }

  @Get("transactions/seller")
  @UseGuards(JwtAuthGuard)
  getSellerTransactions(
    @GetUser("id") userId: string,
    @Query("status") status?: string,
  ) {
    return this.chatService.getSellerTransactions(userId, status);
  }

  // ============ ADMIN ENDPOINTS ============

  @Get("admin/rooms")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  async getAdminChatRooms(
    @GetUser("id") adminId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
    @Query("unassigned") unassigned?: string,
  ) {
    return this.chatService.getAdminChatRooms(adminId, +page, +limit, unassigned === "true");
  }

  @Post("admin/assign/:roomId")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  async assignAdminToRoom(
    @GetUser("id") adminId: string,
    @Param("roomId") roomId: string,
  ) {
    return this.chatService.assignAdminToRoom(adminId, roomId);
  }

  @Post("admin/open-support")
  @UseGuards(RolesGuard)
  @Roles("SUPER_ADMIN", "ADMIN")
  async openAdminSupportRoom(
    @GetUser("id") adminId: string,
    @Body() body: { userId: string; contextType?: string; contextId?: string; contextTitle?: string },
  ) {
    return this.chatService.openAdminSupportRoom(adminId, body.userId, body.contextType, body.contextId, body.contextTitle);
  }
}
