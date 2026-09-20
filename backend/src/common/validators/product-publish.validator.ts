import { BadRequestException } from "@nestjs/common";

type PublishableProduct = {
  name?: string | null;
  description?: string | null;
  categoryId?: string | null;
  productType?: string | null;
  hasVariants?: boolean | null;
  variants?: Array<{ name?: string | null }>;
  digitalDeliveryMethod?: string | null;
  digitalFileUrl?: string | null;
  externalLink?: string | null;
  licenseKey?: string | null;
};

export function assertProductPublishable(product: PublishableProduct): void {
  if (!product.name?.trim() || !product.categoryId?.trim()) {
    throw new BadRequestException("Nama dan kategori produk wajib diisi sebelum publish");
  }
  if (!product.description?.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim()) {
    throw new BadRequestException("Deskripsi produk wajib diisi sebelum publish");
  }
  if (product.productType === "DIGITAL") {
    if (product.digitalDeliveryMethod === "FILE_DOWNLOAD" && !product.digitalFileUrl?.trim()) {
      throw new BadRequestException("File produk digital wajib diunggah sebelum publish");
    }
    if (["EXTERNAL_LINK", "GOOGLE_DRIVE"].includes(product.digitalDeliveryMethod || "") && !product.externalLink?.trim()) {
      throw new BadRequestException("Link produk digital wajib diisi sebelum publish");
    }
    if (product.digitalDeliveryMethod === "LICENSE_KEY" && !product.licenseKey?.trim()) {
      throw new BadRequestException("License key wajib diisi sebelum publish");
    }
  } else if (product.hasVariants) {
    if (!product.variants?.length || product.variants.some((variant) => !variant.name?.trim())) {
      throw new BadRequestException("Produk bervarian harus memiliki minimal satu varian bernama sebelum publish");
    }
  }
}
