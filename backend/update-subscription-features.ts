import { PrismaClient, SubscriptionPlan } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSubscriptionFeatures() {
  console.log('Updating subscription plan features...');

  const updates = [
    {
      plan: SubscriptionPlan.FREE,
      data: {
        canRequestPhysicalVerification: false,
        canSubmitProposal: false,
        canWhatsappCheckout: false,
        canToolsRecommendation: false,
        canBecomeAffiliate: false,
        canBoostListing: false,
      },
    },
    {
      plan: SubscriptionPlan.BASIC,
      data: {
        canRequestPhysicalVerification: true,
        canSubmitProposal: true,
        canWhatsappCheckout: true,
        canToolsRecommendation: true,
        canBecomeAffiliate: true,
        canBoostListing: false,
      },
    },
    {
      plan: SubscriptionPlan.PREMIUM,
      data: {
        canRequestPhysicalVerification: true,
        canSubmitProposal: true,
        canWhatsappCheckout: true,
        canToolsRecommendation: true,
        canBecomeAffiliate: true,
        canBoostListing: true,
      },
    },
    {
      plan: SubscriptionPlan.PROFESSIONAL,
      data: {
        canRequestPhysicalVerification: true,
        canSubmitProposal: true,
        canWhatsappCheckout: true,
        canToolsRecommendation: true,
        canBecomeAffiliate: true,
        canBoostListing: true,
      },
    },
    {
      plan: SubscriptionPlan.ENTERPRISE,
      data: {
        canRequestPhysicalVerification: true,
        canSubmitProposal: true,
        canWhatsappCheckout: true,
        canToolsRecommendation: true,
        canBecomeAffiliate: true,
        canBoostListing: true,
      },
    },
    {
      plan: SubscriptionPlan.ULTIMATE,
      data: {
        canRequestPhysicalVerification: true,
        canSubmitProposal: true,
        canWhatsappCheckout: true,
        canToolsRecommendation: true,
        canBecomeAffiliate: true,
        canBoostListing: true,
      },
    },
  ];

  for (const update of updates) {
    try {
      const result = await prisma.subscriptionPlanConfig.update({
        where: { plan: update.plan },
        data: update.data,
      });
      console.log(`✓ Updated ${update.plan} plan`);
    } catch (error) {
      console.error(`✗ Failed to update ${update.plan} plan:`, error);
    }
  }

  // Verify updates
  console.log('\nVerifying updates...');
  const plans = await prisma.subscriptionPlanConfig.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      plan: true,
      canBoostListing: true,
      canRequestPhysicalVerification: true,
      canSubmitProposal: true,
      canWhatsappCheckout: true,
      canToolsRecommendation: true,
      canBecomeAffiliate: true,
    },
  });

  console.table(plans);
  console.log('\n✓ Migration completed successfully!');
}

updateSubscriptionFeatures()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
