import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  SubmitDeliveryDto,
  RespondDeliveryDto,
  RequestCancellationDto,
  RespondCancellationDto,
  RequestExtensionDto,
  RespondExtensionDto,
  CreateMilestoneDto,
} from "./orders.dto";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";
import { GetTenant } from "@common/decorators/get-tenant.decorator";
import { GetUser } from "@common/decorators/get-user.decorator";
import { OrderStatus, UserRole } from "@prisma/client";

@Controller("api/orders")
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  createOrder(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(tenantId, userId, dto);
  }

  @Get("buyer")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  getBuyerOrders(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: OrderStatus,
  ) {
    return this.ordersService.getBuyerOrders(
      tenantId,
      userId,
      page,
      limit,
      status,
    );
  }

  @Get("seller")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  getSellerOrders(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: OrderStatus,
  ) {
    return this.ordersService.getSellerOrders(
      tenantId,
      userId,
      page,
      limit,
      status,
    );
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  getOrder(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
  ) {
    return this.ordersService.getOrder(tenantId, orderId, userId);
  }

  @Put(":id/status")
  @UseGuards(JwtAuthGuard)
  updateOrderStatus(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(tenantId, orderId, userId, dto);
  }

  // ============ DELIVERY ============

  @Post(":id/deliver")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  submitDelivery(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: SubmitDeliveryDto,
  ) {
    return this.ordersService.submitDelivery(tenantId, orderId, userId, dto);
  }

  @Put(":id/delivery/:deliveryId/respond")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  respondToDelivery(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Param("deliveryId") deliveryId: string,
    @Body() dto: RespondDeliveryDto,
  ) {
    return this.ordersService.respondToDelivery(
      tenantId,
      orderId,
      userId,
      deliveryId,
      dto,
    );
  }

  // ============ CANCELLATION ============

  @Post(":id/cancel")
  @UseGuards(JwtAuthGuard)
  requestCancellation(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: RequestCancellationDto,
  ) {
    return this.ordersService.requestCancellation(
      tenantId,
      orderId,
      userId,
      dto,
    );
  }

  @Put(":id/cancel/respond")
  @UseGuards(JwtAuthGuard)
  respondToCancellation(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: RespondCancellationDto,
  ) {
    return this.ordersService.respondToCancellation(
      tenantId,
      orderId,
      userId,
      dto,
    );
  }

  // ============ EXTENSION ============

  @Post(":id/extension")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  requestExtension(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: RequestExtensionDto,
  ) {
    return this.ordersService.requestExtension(tenantId, orderId, userId, dto);
  }

  @Put(":id/extension/respond")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  respondToExtension(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: RespondExtensionDto,
  ) {
    return this.ordersService.respondToExtension(
      tenantId,
      orderId,
      userId,
      dto,
    );
  }

  // ============ MILESTONES ============

  @Post(":id/milestones")
  @UseGuards(JwtAuthGuard)
  createMilestone(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.ordersService.createMilestone(tenantId, orderId, userId, dto);
  }

  @Post(":id/milestones/:milestoneId/complete")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.BUYER)
  completeMilestone(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
    @Param("milestoneId") milestoneId: string,
  ) {
    return this.ordersService.completeMilestone(
      tenantId,
      orderId,
      milestoneId,
      userId,
    );
  }

  // ============ TIMELINE ============

  @Get(":id/timeline")
  @UseGuards(JwtAuthGuard)
  getOrderTimeline(
    @GetTenant("id") tenantId: string,
    @GetUser("id") userId: string,
    @Param("id") orderId: string,
  ) {
    return this.ordersService.getOrderTimeline(tenantId, orderId, userId);
  }
}
