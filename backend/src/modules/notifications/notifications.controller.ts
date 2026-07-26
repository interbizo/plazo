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
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";

@Controller("api/notifications")
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @GetTenant("id") tenantId: string | null,
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20,
    @Query("unread") unread: boolean = false,
  ) {
    return this.notificationsService.getNotifications(
      tenantId,
      userId,
      page,
      limit,
      unread,
    );
  }

  @Get("unread-count")
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(
    @GetTenant("id") tenantId: string | null,
    @GetUser("id") userId: string,
  ) {
    return this.notificationsService.getUnreadCount(tenantId, userId);
  }

  @Post(":id/read")
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @GetTenant("id") tenantId: string | null,
    @GetUser("id") userId: string,
    @Param("id") notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      tenantId,
      userId,
      notificationId,
    );
  }

  @Post("read-all")
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(
    @GetTenant("id") tenantId: string | null,
    @GetUser("id") userId: string,
  ) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  async deleteNotification(
    @GetTenant("id") tenantId: string | null,
    @GetUser("id") userId: string,
    @Param("id") notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(
      tenantId,
      userId,
      notificationId,
    );
  }
}
