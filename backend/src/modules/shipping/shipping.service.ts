import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";
import axios from "axios";
import { EstimateProductShippingDto } from "./shipping.dto";

interface ShippingDestinationRow {
  id?: number | string;
  label?: string;
  province_name?: string;
  city_name?: string;
  district_name?: string;
  subdistrict_name?: string;
  zip_code?: string;
}

export interface ShippingDestination {
  id: number;
  label: string;
  provinceName?: string;
  cityName?: string;
  districtName?: string;
  subdistrictName?: string;
  zipCode?: string;
}

interface RajaongkirCostRow {
  name?: string;
  code?: string;
  service?: string;
  description?: string;
  cost?: number | string;
  etd?: string;
}

export interface ShippingOption {
  courierName: string;
  courierCode: string;
  service: string;
  description?: string;
  cost: number;
  etd?: string;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly baseUrl =
    process.env.RAJAONGKIR_BASE_URL ||
    "https://rajaongkir.komerce.id/api/v1";

  constructor(private readonly prisma: PrismaService) {}

  async searchDestinations(
    search: string,
    limit = 10,
    offset = 0,
  ): Promise<ShippingDestination[]> {
    const keyword = search?.trim();
    if (!keyword || keyword.length < 3) {
      return [];
    }

    const payload = await this.getRajaongkir("/destination/domestic-destination", {
      search: keyword,
      limit,
      offset,
    });

    const rows: ShippingDestinationRow[] = Array.isArray(payload?.data) ? payload.data : [];
    return rows
      .map((row) => this.normalizeDestination(row))
      .filter((row): row is ShippingDestination => Boolean(row));
  }

  async estimateProduct(dto: EstimateProductShippingDto) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        deletedAt: null,
        isPublished: true,
        productType: "PHYSICAL",
        isDigital: false,
        tenant: {
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        tenant: {
          select: {
            city: true,
            province: true,
            shippingOriginId: true,
            shippingOriginLabel: true,
            shippingCourierCode: true,
          },
        },
      },
    });

    if (!product) {
      throw new BadRequestException("Produk fisik tidak ditemukan");
    }

    const quantity = Math.max(1, dto.quantity || 1);
    const defaultWeight = Number(process.env.RAJAONGKIR_DEFAULT_WEIGHT_GRAM) || 1000;
    const weightGram = Math.max(1, Math.ceil((product.weightGram || defaultWeight) * quantity));
    const origin = await this.resolveOrigin(product.tenant);
    const courier = this.normalizeCourier(product.tenant.shippingCourierCode || undefined);

    const params = new URLSearchParams();
    params.set("origin", String(origin.id));
    params.set("destination", String(dto.destinationId));
    params.set("weight", String(weightGram));
    params.set("courier", courier);
    params.set("price", "lowest");

    const payload = await this.postRajaongkir("/calculate/domestic-cost", params);
    const rows: RajaongkirCostRow[] = Array.isArray(payload?.data) ? payload.data : [];
    const options = rows
      .map((row) => this.normalizeCost(row))
      .filter((row): row is ShippingOption => Boolean(row))
      .sort((a, b) => a.cost - b.cost);

    if (!options.length) {
      throw new BadRequestException("Estimasi ongkir tidak tersedia untuk tujuan ini");
    }

    return {
      origin,
      destinationId: dto.destinationId,
      weightGram,
      courier,
      cheapest: options[0],
      options,
    };
  }

  private async resolveOrigin(tenant: {
    city?: string | null;
    province?: string | null;
    shippingOriginId?: string | null;
    shippingOriginLabel?: string | null;
  }): Promise<ShippingDestination> {
    const storedOriginId = Number(tenant.shippingOriginId);
    if (Number.isInteger(storedOriginId) && storedOriginId > 0) {
      return {
        id: storedOriginId,
        label: tenant.shippingOriginLabel || "Asal toko",
      };
    }

    const defaultOriginId = Number(process.env.RAJAONGKIR_DEFAULT_ORIGIN_ID);
    if (Number.isInteger(defaultOriginId) && defaultOriginId > 0) {
      return {
        id: defaultOriginId,
        label: process.env.RAJAONGKIR_DEFAULT_ORIGIN_LABEL || "Asal toko",
      };
    }

    const keyword = [tenant.city, tenant.province].filter(Boolean).join(" ").trim();
    if (!keyword) {
      throw new BadRequestException("Asal pengiriman toko belum dikonfigurasi");
    }

    const destinations = await this.searchDestinations(keyword, 50, 0);
    const origin = destinations.find(
      (destination) =>
        this.normalizeLocationName(destination.cityName) === this.normalizeLocationName(tenant.city) &&
        this.normalizeLocationName(destination.provinceName) === this.normalizeLocationName(tenant.province),
    );
    if (!origin) {
      throw new BadRequestException("Asal pengiriman toko belum ditemukan di layanan ongkir");
    }

    return origin;
  }

  private normalizeLocationName(value?: string | null) {
    return (value || "")
      .toUpperCase()
      .replace(/^(KOTA|KABUPATEN)\s+/, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  private normalizeCourier(courier?: string) {
    const fallback =
      process.env.RAJAONGKIR_DEFAULT_COURIER ||
      process.env.RAJAONGKIR_DEFAULT_COURIERS?.split(":")[0] ||
      "jne";
    const value = courier?.trim() || fallback;
    return value
      .split(":")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .join(":");
  }

  private normalizeDestination(
    row: ShippingDestinationRow,
  ): ShippingDestination | null {
    const id = Number(row.id);
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    return {
      id,
      label: row.label || [
        row.subdistrict_name,
        row.district_name,
        row.city_name,
        row.province_name,
        row.zip_code,
      ].filter(Boolean).join(", "),
      provinceName: row.province_name,
      cityName: row.city_name,
      districtName: row.district_name,
      subdistrictName: row.subdistrict_name,
      zipCode: row.zip_code,
    };
  }

  private normalizeCost(row: RajaongkirCostRow): ShippingOption | null {
    const cost = Number(row.cost);
    if (!Number.isFinite(cost) || cost < 0 || !row.service) {
      return null;
    }

    return {
      courierName: row.name || row.code || "Kurir",
      courierCode: row.code || "",
      service: row.service,
      description: row.description,
      cost,
      etd: row.etd,
    };
  }

  private async getRajaongkir(path: string, params: Record<string, unknown>) {
    this.ensureApiKey();

    try {
      const response = await axios.get(`${this.baseUrl}${path}`, {
        headers: { key: process.env.RAJAONGKIR_API_KEY },
        params,
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.handleRajaongkirError(error);
    }
  }

  private async postRajaongkir(path: string, data: URLSearchParams) {
    this.ensureApiKey();

    try {
      const response = await axios.post(`${this.baseUrl}${path}`, data, {
        headers: {
          key: process.env.RAJAONGKIR_API_KEY,
          "content-type": "application/x-www-form-urlencoded",
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      this.handleRajaongkirError(error);
    }
  }

  private ensureApiKey() {
    if (!process.env.RAJAONGKIR_API_KEY) {
      throw new ServiceUnavailableException("API key layanan ongkir belum dikonfigurasi");
    }
  }

  private handleRajaongkirError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = (error.response?.data as { meta?: { message?: string } })?.meta?.message;
      this.logger.warn(`RajaOngkir request failed: ${status || error.code || error.message}`);

      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(message || "Permintaan ongkir tidak valid");
      }
    }

    throw new ServiceUnavailableException("Layanan ongkir belum tersedia");
  }
}