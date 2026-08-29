export interface WhatsAppCheckoutShippingEstimate {
  courierName?: string;
  courierCode?: string;
  service?: string;
  cost: number;
  etd?: string;
  destinationLabel?: string;
  weightGram?: number;
}

export interface WhatsAppCheckoutTemplate {
  phoneNumber: string;
  buyerName?: string | null;
  buyerAddress?: string | null;
  itemLabel: "Produk" | "Layanan";
  itemName: string;
  price: number;
  itemUrl: string;
  optionLabel?: string | null;
  optionValue?: string | null;
  quantity?: number;
  shippingEstimate?: WhatsAppCheckoutShippingEstimate | null;
}

function normalizeWhatsAppNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function formatCheckoutPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatShippingEtd(etd?: string) {
  const value = etd?.trim();
  if (!value) return "";
  return /\b(day|hari)\b/i.test(value) ? value : `${value} hari`;
}

export function createWhatsAppCheckoutUrl(template: WhatsAppCheckoutTemplate) {
  const phone = normalizeWhatsAppNumber(template.phoneNumber);
  if (!phone) return "";

  const buyerName = template.buyerName?.trim() || "-";
  const safePrice = Number.isFinite(Number(template.price)) ? Number(template.price) : 0;
  const safeQuantity = template.quantity && template.quantity > 0 ? template.quantity : 0;
  const itemTotal = safeQuantity ? safePrice * safeQuantity : safePrice;
  const shippingCost = template.shippingEstimate?.cost || 0;
  const grandTotal = itemTotal + shippingCost;

  const details = [
    `Nama: ${buyerName}`,
    `${template.itemLabel}: ${template.itemName}`,
    template.optionLabel && template.optionValue
      ? `${template.optionLabel}: ${template.optionValue}`
      : null,
    `Harga: ${formatCheckoutPrice(safePrice)}`,
    safeQuantity ? `Jumlah: ${safeQuantity}` : null,
    safeQuantity ? `Subtotal: ${formatCheckoutPrice(itemTotal)}` : null,
    template.buyerAddress?.trim() ? `Alamat: ${template.buyerAddress.trim()}` : null,
    template.shippingEstimate?.destinationLabel
      ? `Tujuan ongkir: ${template.shippingEstimate.destinationLabel}`
      : null,
    template.shippingEstimate
      ? `Ongkir: ${formatCheckoutPrice(shippingCost)}`
      : null,
    template.shippingEstimate?.etd
      ? `Estimasi tiba: ${formatShippingEtd(template.shippingEstimate.etd)}`
      : null,
    template.shippingEstimate ? `Total estimasi: ${formatCheckoutPrice(grandTotal)}` : null,
    `Link: ${template.itemUrl}`,
  ].filter(Boolean);

  const message = ["Halo, saya ingin checkout.", "", ...details].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
