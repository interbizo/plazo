import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import { CreateCustomOfferDto } from "./custom-offers.dto";
import { NotificationEventsService } from "@modules/notifications/notification-events.service";

@Injectable()
export class CustomOffersService {
  constructor(
    private prisma: PrismaService,
    private notifEvents: NotificationEventsService,
  ) {}

  async createOffer(sellerId: string, dto: CreateCustomOfferDto) {
    if (sellerId === dto.buyerId) {
      throw new BadRequestException("Cannot send offer to yourself");
    }

    const buyer = await this.prisma.user.findUnique({
      where: { id: dto.buyerId },
    });
    if (!buyer) throw new NotFoundException("Buyer not found");

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    const offer = await this.prisma.customOffer.create({
      data: {
        sellerId,
        buyerId: dto.buyerId,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        deliveryDays: dto.deliveryDays,
        revisions: dto.revisions,
        chatRoomId: dto.chatRoomId,
        expiresAt,
      },
    });

    // Notify buyer
    const seller = await this.prisma.user.findUnique({
      where: { id: sellerId },
      select: { firstName: true, lastName: true },
    });
    const sellerTenant = await this.prisma.tenant.findFirst({
      where: { ownerId: sellerId, deletedAt: null },
    });
    if (seller && sellerTenant) {
      await this.notifEvents.onCustomOfferSent({
        tenantId: sellerTenant.id,
        buyerId: dto.buyerId,
        sellerName: `${seller.firstName} ${seller.lastName}`,
        offerTitle: dto.title,
        offerId: offer.id,
      });
    }

    return { message: "Custom offer sent", offer };
  }

  async getMyOffers(userId: string, role: "buyer" | "seller") {
    const where =
      role === "seller" ? { sellerId: userId } : { buyerId: userId };

    return this.prisma.customOffer.findMany({
      where,
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getOfferDetail(offerId: string, userId: string) {
    const offer = await this.prisma.customOffer.findUnique({
      where: { id: offerId },
      include: {
        seller: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        buyer: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.sellerId !== userId && offer.buyerId !== userId) {
      throw new ForbiddenException("Not your offer");
    }

    return { offer };
  }

  async acceptOffer(offerId: string, buyerId: string) {
    const offer = await this.prisma.customOffer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.buyerId !== buyerId)
      throw new ForbiddenException("Not your offer");
    if (offer.isAccepted || offer.isDeclined)
      throw new BadRequestException("Offer already responded to");
    if (offer.expiresAt < new Date())
      throw new BadRequestException("Offer expired");

    // Get seller's tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: offer.sellerId, deletedAt: null },
    });
    if (!tenant) throw new BadRequestException("Seller has no active store");

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + offer.deliveryDays);

    // Create order from offer
    const order = await this.prisma.order.create({
      data: {
        tenantId: tenant.id,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        title: offer.title,
        description: offer.description,
        amount: offer.price,
        maxRevisions: offer.revisions,
        status: "PENDING",
        deliveryDeadline: deadline,
        escrowAmount: offer.price,
      },
    });

    // Create chat room for order
    await this.prisma.chatRoom.create({
      data: {
        tenantId: tenant.id,
        orderId: order.id,
        participants: {
          connect: [{ id: buyerId }, { id: offer.sellerId }],
        },
      },
    });

    // Escrow transaction
    await this.prisma.transaction.create({
      data: {
        userId: buyerId,
        type: "ESCROW_HOLD",
        amount: offer.price,
        fee: 0,
        netAmount: offer.price,
        status: "COMPLETED",
        orderId: order.id,
        description: `Escrow for custom offer: ${offer.title}`,
      },
    });

    // Mark offer accepted
    await this.prisma.customOffer.update({
      where: { id: offerId },
      data: { isAccepted: true, orderId: order.id },
    });

    // Notify seller
    const buyerUser = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { firstName: true, lastName: true },
    });
    if (buyerUser) {
      await this.notifEvents.onCustomOfferAccepted({
        tenantId: tenant.id,
        sellerId: offer.sellerId,
        buyerName: `${buyerUser.firstName} ${buyerUser.lastName}`,
        offerTitle: offer.title,
        offerId: offer.id,
      });
    }

    return { message: "Offer accepted, order created", order };
  }

  async declineOffer(offerId: string, buyerId: string) {
    const offer = await this.prisma.customOffer.findUnique({
      where: { id: offerId },
    });
    if (!offer) throw new NotFoundException("Offer not found");
    if (offer.buyerId !== buyerId)
      throw new ForbiddenException("Not your offer");

    await this.prisma.customOffer.update({
      where: { id: offerId },
      data: { isDeclined: true },
    });

    // Notify seller
    const buyerUser2 = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { firstName: true, lastName: true },
    });
    const sellerTenant2 = await this.prisma.tenant.findFirst({
      where: { ownerId: offer.sellerId, deletedAt: null },
    });
    if (buyerUser2 && sellerTenant2) {
      await this.notifEvents.onCustomOfferDeclined({
        tenantId: sellerTenant2.id,
        sellerId: offer.sellerId,
        buyerName: `${buyerUser2.firstName} ${buyerUser2.lastName}`,
        offerTitle: offer.title,
        offerId: offer.id,
      });
    }

    return { message: "Offer declined" };
  }
}
