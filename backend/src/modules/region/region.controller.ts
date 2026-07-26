import { Controller, Get, Param } from "@nestjs/common";

/**
 * Proxy for Indonesian region data API.
 * Uses emsifa/api-wilayah-indonesia (free, no API key needed).
 * Source: https://github.com/emsifa/api-wilayah-indonesia
 *
 * This proxy avoids CORS issues and allows caching on our server.
 */

const BASE_URL =
  "https://emsifa.github.io/api-wilayah-indonesia/api";

@Controller("api/regions")
export class RegionController {
  /**
   * Get all provinces
   * GET /api/regions/provinces
   */
  @Get("provinces")
  async getProvinces() {
    const res = await fetch(`${BASE_URL}/provinces.json`);
    if (!res.ok) return [];
    return res.json();
  }

  /**
   * Get cities/regencies by province ID
   * GET /api/regions/provinces/:id/cities
   */
  @Get("provinces/:id/cities")
  async getCities(@Param("id") provinceId: string) {
    const res = await fetch(`${BASE_URL}/regencies/${provinceId}.json`);
    if (!res.ok) return [];
    return res.json();
  }

  /**
   * Get districts by city/regency ID
   * GET /api/regions/cities/:id/districts
   */
  @Get("cities/:id/districts")
  async getDistricts(@Param("id") cityId: string) {
    const res = await fetch(`${BASE_URL}/districts/${cityId}.json`);
    if (!res.ok) return [];
    return res.json();
  }

  /**
   * Get villages by district ID (optional, for more granularity)
   * GET /api/regions/districts/:id/villages
   */
  @Get("districts/:id/villages")
  async getVillages(@Param("id") districtId: string) {
    const res = await fetch(`${BASE_URL}/villages/${districtId}.json`);
    if (!res.ok) return [];
    return res.json();
  }
}
