import { SetMetadata } from "@nestjs/common";
import { SellerTier } from "@prisma/client";

export const RequireSellerTier = (...tiers: SellerTier[]) => SetMetadata("sellerTiers", tiers);
