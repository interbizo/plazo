import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "@modules/database/prisma.service";

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string) {
    return this.prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  /**
   * Get default address for a user
   */
  async getDefaultAddress(userId: string) {
    const address = await this.prisma.shippingAddress.findFirst({
      where: { userId, isDefault: true },
    });
    // Fallback to most recent if no default
    if (!address) {
      return this.prisma.shippingAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
    }
    return address;
  }

  /**
   * Create a new address
   */
  async createAddress(
    userId: string,
    data: {
      label: string;
      name: string;
      phone: string;
      address: string;
      province: string;
      provinceId?: string;
      city: string;
      cityId?: string;
      district: string;
      districtId?: string;
      postalCode: string;
      isDefault?: boolean;
    },
  ) {
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first address, make it default
    const count = await this.prisma.shippingAddress.count({
      where: { userId },
    });

    const address = await this.prisma.shippingAddress.create({
      data: {
        userId,
        label: data.label,
        name: data.name,
        phone: data.phone,
        address: data.address,
        province: data.province,
        provinceId: data.provinceId,
        city: data.city,
        cityId: data.cityId,
        district: data.district,
        districtId: data.districtId,
        postalCode: data.postalCode,
        isDefault: data.isDefault ?? count === 0, // First address = default
      },
    });

    return { message: "Alamat berhasil ditambahkan", address };
  }

  /**
   * Update an address
   */
  async updateAddress(
    userId: string,
    addressId: string,
    data: {
      label?: string;
      name?: string;
      phone?: string;
      address?: string;
      province?: string;
      provinceId?: string;
      city?: string;
      cityId?: string;
      district?: string;
      districtId?: string;
      postalCode?: string;
      isDefault?: boolean;
    },
  ) {
    const existing = await this.prisma.shippingAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) throw new NotFoundException("Alamat tidak ditemukan");

    if (data.isDefault) {
      await this.prisma.shippingAddress.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.shippingAddress.update({
      where: { id: addressId },
      data,
    });

    return { message: "Alamat berhasil diperbarui", address };
  }

  /**
   * Delete an address
   */
  async deleteAddress(userId: string, addressId: string) {
    const existing = await this.prisma.shippingAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) throw new NotFoundException("Alamat tidak ditemukan");

    await this.prisma.shippingAddress.delete({
      where: { id: addressId },
    });

    // If deleted address was default, set the most recent as default
    if (existing.isDefault) {
      const next = await this.prisma.shippingAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      if (next) {
        await this.prisma.shippingAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: "Alamat berhasil dihapus" };
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string) {
    const existing = await this.prisma.shippingAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) throw new NotFoundException("Alamat tidak ditemukan");

    await this.prisma.shippingAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    await this.prisma.shippingAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return { message: "Alamat utama berhasil diubah" };
  }
}
