import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPaymentAccounts() {
  console.log('🌱 Seeding payment accounts...');

  // Platform payment accounts (tenantId = null)
  const accounts = await prisma.paymentAccount.createMany({
    data: [
      {
        type: 'BANK_TRANSFER',
        bankName: 'BCA',
        accountNumber: '1234567890',
        accountName: 'PT Plazo Indonesia',
        isActive: true,
        isPrimary: true,
        isVerified: true
      },
      {
        type: 'BANK_TRANSFER',
        bankName: 'Mandiri',
        accountNumber: '0987654321',
        accountName: 'PT Plazo Indonesia',
        isActive: true,
        isPrimary: false,
        isVerified: true
      },
      {
        type: 'E_WALLET',
        walletType: 'OVO',
        phoneNumber: '081234567890',
        accountNumber: '081234567890',
        accountName: 'PT Plazo Indonesia',
        isActive: true,
        isPrimary: false,
        isVerified: true
      },
      {
        type: 'E_WALLET',
        walletType: 'GoPay',
        phoneNumber: '081234567890',
        accountNumber: '081234567890',
        accountName: 'PT Plazo Indonesia',
        isActive: true,
        isPrimary: false,
        isVerified: true
      },
      {
        type: 'E_WALLET',
        walletType: 'DANA',
        phoneNumber: '081234567890',
        accountNumber: '081234567890',
        accountName: 'PT Plazo Indonesia',
        isActive: true,
        isPrimary: false,
        isVerified: true
      }
    ],
    skipDuplicates: true
  });

  console.log(`✅ Created ${accounts.count} payment accounts`);
}

seedPaymentAccounts()
  .catch((e) => {
    console.error('❌ Error seeding payment accounts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
