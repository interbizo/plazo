import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import axios from "axios";

/**
 * Location Service
 * Manages provinces and cities data from Indonesia Region API
 * API Source: https://emsifa.github.io/api-wilayah-indonesia/
 */
@Injectable()
export class LocationService implements OnModuleInit {
  private readonly logger = new Logger(LocationService.name);
  private readonly API_BASE_URL = "https://emsifa.github.io/api-wilayah-indonesia/api";

  constructor(private prisma: PrismaService) {}

  /**
   * Auto-sync location data on module initialization if database is empty
   */
  async onModuleInit() {
    try {
      const provinceCount = await this.prisma.province.count();
      
      if (provinceCount === 0) {
        this.logger.log("No provinces found in database. Starting auto-sync...");
        await this.syncProvinces();
        await this.syncAllCities();
        this.logger.log("Location data auto-sync completed successfully");
      } else {
        this.logger.log(`Location data already exists (${provinceCount} provinces)`);
      }
    } catch (error) {
      this.logger.error("Failed to auto-sync location data on startup", error);
      // Don't throw error to prevent app from crashing
    }
  }

  /**
   * Sync provinces from external API to database
   */
  async syncProvinces() {
    try {
      this.logger.log("Fetching provinces from external API...");
      const response = await axios.get(`${this.API_BASE_URL}/provinces.json`);
      const provinces = response.data;

      this.logger.log(`Found ${provinces.length} provinces`);

      for (const province of provinces) {
        await this.prisma.province.upsert({
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

      this.logger.log("Provinces synced successfully");
      return { message: "Provinces synced successfully", count: provinces.length };
    } catch (error) {
      this.logger.error("Failed to sync provinces", error);
      throw error;
    }
  }

  /**
   * Sync cities for a specific province
   */
  async syncCitiesByProvince(provinceId: string) {
    try {
      this.logger.log(`Fetching cities for province ${provinceId}...`);
      const response = await axios.get(`${this.API_BASE_URL}/regencies/${provinceId}.json`);
      const cities = response.data;

      this.logger.log(`Found ${cities.length} cities for province ${provinceId}`);

      for (const city of cities) {
        await this.prisma.city.upsert({
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

      this.logger.log(`Cities synced successfully for province ${provinceId}`);
      return { message: "Cities synced successfully", count: cities.length };
    } catch (error) {
      this.logger.error(`Failed to sync cities for province ${provinceId}`, error);
      throw error;
    }
  }

  /**
   * Sync districts for a specific city
   */
  async syncDistrictsByCity(cityId: string) {
    try {
      this.logger.log(`Fetching districts for city ${cityId}...`);
      const response = await axios.get(`${this.API_BASE_URL}/districts/${cityId}.json`);
      const districts = response.data;

      this.logger.log(`Found ${districts.length} districts for city ${cityId}`);

      for (const district of districts) {
        await this.prisma.district.upsert({
          where: { id: district.id },
          create: {
            id: district.id,
            cityId: district.regency_id,
            name: district.name,
            isActive: true,
            sortOrder: 0,
          },
          update: {
            name: district.name,
            cityId: district.regency_id,
          },
        });
      }

      this.logger.log(`Districts synced successfully for city ${cityId}`);
      return { message: "Districts synced successfully", count: districts.length };
    } catch (error) {
      this.logger.error(`Failed to sync districts for city ${cityId}`, error);
      throw error;
    }
  }

  /**
   * Sync villages for a specific district
   */
  async syncVillagesByDistrict(districtId: string) {
    try {
      this.logger.log(`Fetching villages for district ${districtId}...`);
      const response = await axios.get(`${this.API_BASE_URL}/villages/${districtId}.json`);
      const villages = response.data;

      this.logger.log(`Found ${villages.length} villages for district ${districtId}`);

      for (const village of villages) {
        await this.prisma.village.upsert({
          where: { id: village.id },
          create: {
            id: village.id,
            districtId: village.district_id,
            name: village.name,
            isActive: true,
            sortOrder: 0,
          },
          update: {
            name: village.name,
            districtId: village.district_id,
          },
        });
      }

      this.logger.log(`Villages synced successfully for district ${districtId}`);
      return { message: "Villages synced successfully", count: villages.length };
    } catch (error) {
      this.logger.error(`Failed to sync villages for district ${districtId}`, error);
      throw error;
    }
  }

  /**
   * Sync all cities for all provinces
   */
  async syncAllCities() {
    try {
      const provinces = await this.prisma.province.findMany({
        where: { isActive: true },
      });

      this.logger.log(`Syncing cities for ${provinces.length} provinces...`);

      let totalCities = 0;
      for (const province of provinces) {
        const result = await this.syncCitiesByProvince(province.id);
        totalCities += result.count;
      }

      this.logger.log(`All cities synced successfully. Total: ${totalCities}`);
      return { message: "All cities synced successfully", count: totalCities };
    } catch (error) {
      this.logger.error("Failed to sync all cities", error);
      throw error;
    }
  }

  /**
   * Get all provinces
   */
  async getProvinces() {
    const provinces = await this.prisma.province.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        sortOrder: true,
      },
    });

    return { data: provinces };
  }

  /**
   * Get cities by province
   */
  async getCitiesByProvince(provinceId: string) {
    const cities = await this.prisma.city.findMany({
      where: {
        provinceId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        provinceId: true,
        sortOrder: true,
      },
    });

    return { data: cities };
  }

  /**
   * Get all cities (for dropdown/autocomplete)
   */
  async getAllCities() {
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        provinceId: true,
        province: {
          select: {
            name: true,
          },
        },
      },
    });

    return { data: cities };
  }

  /**
   * Search cities by name
   */
  async searchCities(query: string) {
    const cities = await this.prisma.city.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        provinceId: true,
        province: {
          select: {
            name: true,
          },
        },
      },
    });

    return { data: cities };
  }

  /**
   * Get districts by city
   */
  async getDistrictsByCity(cityId: string) {
    const districts = await this.prisma.district.findMany({
      where: {
        cityId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        cityId: true,
        sortOrder: true,
      },
    });

    return { data: districts };
  }

  /**
   * Get all districts
   */
  async getAllDistricts() {
    const districts = await this.prisma.district.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        cityId: true,
        city: {
          select: {
            name: true,
            province: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return { data: districts };
  }

  /**
   * Search districts by name
   */
  async searchDistricts(query: string) {
    const districts = await this.prisma.district.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 20,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        cityId: true,
        city: {
          select: {
            name: true,
            province: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return { data: districts };
  }

  /**
   * Get villages by district
   */
  async getVillagesByDistrict(districtId: string) {
    const villages = await this.prisma.village.findMany({
      where: {
        districtId,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        districtId: true,
        sortOrder: true,
      },
    });

    return { data: villages };
  }

  /**
   * Update province status
   */
  async updateProvinceStatus(provinceId: string, isActive: boolean) {
    await this.prisma.province.update({
      where: { id: provinceId },
      data: { isActive },
    });

    return { message: "Province status updated" };
  }

  /**
   * Update city status
   */
  async updateCityStatus(cityId: string, isActive: boolean) {
    await this.prisma.city.update({
      where: { id: cityId },
      data: { isActive },
    });

    return { message: "City status updated" };
  }
}
