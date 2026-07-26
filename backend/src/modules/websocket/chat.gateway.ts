import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ChatService } from "../chat/chat.service";
import { Inject, Logger, forwardRef } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@modules/database/prisma.service";

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://plazo.id",
        "https://api.plazo.id",
      ];

      // Check exact match first
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      // Check wildcard subdomain patterns
      const allowedPatterns = [
        /\.plazo\.id$/,
        /\.ehftest\.dev$/,
        /\.plazo\.com$/,
        /^http:\/\/localhost(:\d+)?$/,
      ];

      const isAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
      callback(null, isAllowed);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger("ChatGateway");
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Connection rejected: no token provided`);
        client.emit("error", { message: "Authentication required" });
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub || decoded.id;

      if (!userId) {
        client.emit("error", { message: "Invalid token" });
        client.disconnect();
        return;
      }

      // Verify user is still active
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
      });
      if (!user || !user.isActive) {
        client.emit("error", { message: "Account is inactive or banned" });
        client.disconnect();
        return;
      }

      // Attach user data to socket
      (client as any).userId = userId;
      (client as any).userRole = decoded.role;

      this.userSockets.set(userId, client.id);

      // Update lastActiveAt on WebSocket connect
      this.prisma.user
        .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
        .catch(() => {});

      client.emit("connected", {
        message: "Connected to chat gateway",
        userId,
      });
      this.logger.log(`User ${userId} connected: ${client.id}`);
    } catch (error) {
      this.logger.warn(`Connection rejected: invalid token`);
      client.emit("error", { message: "Invalid or expired token" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      this.userSockets.delete(userId);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  private getAuthUserId(client: Socket): string {
    const userId = (client as any).userId;
    if (!userId) {
      client.emit("error", { message: "Not authenticated" });
      throw new Error("Not authenticated");
    }
    return userId;
  }

  @SubscribeMessage("join-room")
  async handleJoinRoom(client: Socket, data: { roomId: string }) {
    const userId = this.getAuthUserId(client);

    // Verify user is a participant of this room
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: data.roomId,
        participants: { some: { id: userId } },
      },
    });

    if (!room) {
      client.emit("error", {
        message: "Access denied: not a room participant",
      });
      return;
    }

    client.join(`room-${data.roomId}`);
    this.server.to(`room-${data.roomId}`).emit("user-joined", {
      userId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage("send-message")
  async handleSendMessage(
    client: Socket,
    data: {
      roomId: string;
      text: string;
      attachments?: string[];
      clientTempId?: string;
    },
  ) {
    const userId = this.getAuthUserId(client);
    try {
      // Update sender's lastActiveAt
      this.prisma.user
        .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
        .catch(() => {});

      const message = await this.chatService.sendMessage(userId, {
        roomId: data.roomId,
        text: data.text,
        attachments: data.attachments,
      });

      this.server.to(`room-${data.roomId}`).emit("new-message", {
        id: message.id,
        roomId: data.roomId,
        senderId: userId,
        text: data.text,
        attachments: data.attachments,
        sender: message.sender,
        isRead: false,
        createdAt: message.createdAt,
      });

      const room = await this.prisma.chatRoom.findUnique({
        where: { id: data.roomId },
        select: {
          participants: {
            select: { id: true },
          },
        },
      });

      const hasOnlineRecipient = !!room?.participants.some(
        (participant) =>
          participant.id !== userId && this.userSockets.has(participant.id),
      );

      client.emit("message-sent", {
        clientTempId: data.clientTempId,
        message: {
          ...message,
          roomId: data.roomId,
        },
        deliveryStatus: hasOnlineRecipient ? "DELIVERED" : "SENT",
      });
    } catch (error) {
      client.emit("error", { message: "Failed to send message" });
    }
  }

  @SubscribeMessage("typing")
  handleTyping(client: Socket, data: { roomId: string; isTyping: boolean }) {
    const userId = this.getAuthUserId(client);
    client.to(`room-${data.roomId}`).emit("user-typing", {
      userId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage("mark-as-read")
  async handleMarkAsRead(
    client: Socket,
    data: { roomId: string; messageId?: string },
  ) {
    const userId = this.getAuthUserId(client);
    const result = await this.chatService.markAsRead(userId, data.roomId);
    client.to(`room-${data.roomId}`).emit("messages-read", {
      roomId: data.roomId,
      messageId: data.messageId,
      messageIds: result.messageIds,
      readAt: result.readAt,
      userId,
    });
  }

  @SubscribeMessage("online-status")
  handleOnlineStatus(client: Socket) {
    const userId = this.getAuthUserId(client);
    return {
      onlineUsers: Array.from(this.userSockets.keys()),
    };
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  sendNotificationToUser(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit("notification", notification);
      this.logger.debug(`Notification sent to user ${userId} via WebSocket`);
    } else {
      this.logger.debug(`User ${userId} not connected via WebSocket, notification saved to DB only`);
    }
  }

  broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room-${roomId}`).emit(event, data);
  }
}
