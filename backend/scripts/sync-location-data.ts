import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_BASE_URL = 'https://emsifa.github.io/api-wilayah-indonesia/api';

async function syncProvinces() {
  console.log('🌍 Fetching provinces from API...');
  const response = await axios.get(`${API_BASE_URL}/provinces.json`);
  const provinces = response.data;

  console.log(`📍 Found ${provinces.length} provinces`);

  for (const province of provinces) {
    await prisma.province.upsert({
      where: { id: province.id },
      create: {
        id: province.id,
        name: province.name,
        isActive: true,
        sortOrder: 0,
      },
      update: {
        name: province.name,
      },
    });
  }

  console.log('✅ Provinces synced successfully');
  return provinces;
}

async function syncCitiesByProvince(provinceId: string, provinceName: string) {
  console.log(`🏙️  Fetching cities for ${provinceName}...`);
  const response = await axios.get(`${API_BASE_URL}/regencies/${provinceId}.json`);
  const cities = response.data;

  for (const city of cities) {
    await prisma.city.upsert({
      where: { id: city.id },
      create: {
        id: city.id,
        provinceId: city.province_id,
        name: city.name,
        isActive: true,
        sortOrder: 0,
      },
      update: {
        name: city.name,
        provinceId: city.province_id,
      },
    });
  }

  console.log(`   ✓ ${cities.length} cities synced for ${provinceName}`);
  return cities.length;
}

async function main() {
  try {
    console.log('🚀 Starting location data sync...\n');

    // Check if data already exists
    const provinceCount = await prisma.province.count();
    const cityCount = await prisma.city.count();

    console.log(`📊 Current data: ${provinceCount} provinces, ${cityCount} cities\n`);

    // Sync provinces
    const provinces = await syncProvinces();
    console.log('');

    // Sync cities for all provinces
    let totalCities = 0;
    for (const province of provinces) {
      const count = await syncCitiesByProvince(province.id, province.name);
      totalCities += count;
    }

    console.log('\n✨ Sync completed successfully!');
    console.log(`📊 Final data: ${provinces.length} provinces, ${totalCities} cities`);

    // Show sample cities
    const sampleCities = await prisma.city.findMany({
      take: 10,
      include: {
        province: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log('\n📋 Sample cities:');
    sampleCities.forEach((city) => {
      console.log(`   - ${city.name}, ${city.province.name}`);
    });

  } catch (error) {
    console.error('❌ Error syncing location data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
