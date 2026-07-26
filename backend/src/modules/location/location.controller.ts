import { Controller, Get, Post, Put, Query, Param, Body, UseGuards } from "@nestjs/common";
import { LocationService } from "./location.service";
import { JwtAuthGuard } from "@common/guards/jwt-auth.guard";
import { RolesGuard } from "@common/guards/roles.guard";
import { Roles } from "@common/decorators/roles.decorator";

@Controller("api/location")
export class LocationController {
  constructor(private locationService: LocationService) {}

  // ============ PUBLIC ENDPOINTS ============

  @Get("provinces")
  getProvinces() {
    return this.locationService.getProvinces();
  }

  @Get("cities")
  getCitiesByProvince(@Query("provinceId") provinceId?: string) {
    if (provinceId) {
      return this.locationService.getCitiesByProvince(provinceId);
    }
    return this.locationService.getAllCities();
  }

  @Get("cities/search")
  searchCities(@Query("q") query: string) {
    return this.locationService.searchCities(query);
  }

  @Get("districts")
  getDistrictsByCity(@Query("cityId") cityId?: string) {
    if (cityId) {
      return this.locationService.getDistrictsByCity(cityId);
    }
    return this.locationService.getAllDistricts();
  }

  @Get("districts/search")
  searchDistricts(@Query("q") query: string) {
    return this.locationService.searchDistricts(query);
  }

  @Get("villages")
  getVillagesByDistrict(@Query("districtId") districtId?: string) {
    if (districtId) {
      return this.locationService.getVillagesByDistrict(districtId);
    }
    return { data: [] };
  }

  // ============ ADMIN ENDPOINTS ============

  @Post("admin/sync/provinces")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  syncProvinces() {
    return this.locationService.syncProvinces();
  }

  @Post("admin/sync/cities")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  syncAllCities() {
    return this.locationService.syncAllCities();
  }

  @Post("admin/sync/cities/:provinceId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  syncCitiesByProvince(@Param("provinceId") provinceId: string) {
    return this.locationService.syncCitiesByProvince(provinceId);
  }

  @Put("admin/provinces/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  updateProvinceStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
  ) {
    return this.locationService.updateProvinceStatus(id, isActive);
  }

  @Put("admin/cities/:id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "SUPER_ADMIN")
  updateCityStatus(
    @Param("id") id: string,
    @Body("isActive") isActive: boolean,
  ) {
    return this.locationService.updateCityStatus(id, isActive);
  }
}
