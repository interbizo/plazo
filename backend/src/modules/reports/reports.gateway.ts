import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards, Inject, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ReportsService } from "./reports.service";
import { CreateReportMessageDto } from "./reports.dto";
import { UserRole } from "@prisma/client";

@WebSocketGateway({
  cors: {
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:3000",
      "https://plazo.id",
      "https://api.plazo.id",
      /\.plazo\.id$/,
    ],
    credentials: true,
  },
  namespace: "/reports",
})
export class ReportsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ReportsGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    @Inject(forwardRef(() => ReportsService))
    private reportsService: ReportsService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(" ")[1];
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      client.data.userId = userId;
      client.data.role = payload.role;
      this.userSockets.set(userId, client.id);

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Connection error: ${message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.userSockets.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("joinReport")
  async handleJoinReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportId: string },
  ) {
    try {
      const userId = client.data.userId;
      const role = client.data.role;
      const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

      // Verify access to report
      await this.reportsService.getReportById(data.reportId, userId, isAdmin);

      // Join room
      client.join(`report:${data.reportId}`);
      this.logger.log(`User ${userId} joined report room: ${data.reportId}`);

      return { success: true, message: "Joined report room" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Join report error: ${message}`);
      return { success: false, error: message };
    }
  }

  @SubscribeMessage("leaveReport")
  handleLeaveReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportId: string },
  ) {
    client.leave(`report:${data.reportId}`);
    this.logger.log(`User ${client.data.userId} left report room: ${data.reportId}`);
    return { success: true };
  }

  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportId: string; message: string },
  ) {
    try {
      const userId = client.data.userId;
      const role = client.data.role;
      const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;

      const dto: CreateReportMessageDto = { message: data.message };
      const message = await this.reportsService.createReportMessage(
        data.reportId,
        userId,
        dto,
        isAdmin,
      );

      // Broadcast to all users in the report room
      this.server.to(`report:${data.reportId}`).emit("newMessage", message);

      return { success: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Send message error: ${message}`);
      return { success: false, error: message };
    }
  }

  @SubscribeMessage("typing")
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    client.to(`report:${data.reportId}`).emit("userTyping", {
      userId,
      isTyping: data.isTyping,
    });
  }

  // Method to notify users about report status changes
  notifyReportStatusChange(reportId: string, status: string) {
    this.server.to(`report:${reportId}`).emit("reportStatusChanged", {
      reportId,
      status,
    });
  }
}
