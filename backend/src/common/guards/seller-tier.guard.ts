import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "@modules/database/prisma.service";
import { SellerTier } from "@prisma/client";

@Injectable()
export class SellerTierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTiers = this.reflector.getAllAndOverride<SellerTier[]>("sellerTiers", [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredTiers || requiredTiers.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException("Authentication required");

    // Admins bypass tier checks
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;

    const tenant = await this.prisma.tenant.findFirst({
      where: { ownerId: user.id },
      select: { sellerTier: true, subscriptionPlan: true },
    });

    if (!tenant) throw new ForbiddenException("Anda belum memiliki toko");

    if (!requiredTiers.includes(tenant.sellerTier)) {
      throw new ForbiddenException(
        "Fitur ini memerlukan paket berbayar. Silakan upgrade paket Anda."
      );
    }

    return true;
  }
}
