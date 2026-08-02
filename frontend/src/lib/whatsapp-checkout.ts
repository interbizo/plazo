export interface WhatsAppCheckoutTemplate {
  phoneNumber: string;
  buyerName?: string | null;
  itemLabel: "Produk" | "Layanan";
  itemName: string;
  price: number;
  itemUrl: string;
  optionLabel?: string | null;
  optionValue?: string | null;
  quantity?: number;
}

// Menormalkan nomor WhatsApp agar dapat digunakan oleh URL wa.me.
function normalizeWhatsAppNumber(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

// Memformat harga checkout dalam mata uang Rupiah untuk pesan WhatsApp.
function formatCheckoutPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(price);
}

// Membuat URL WhatsApp dengan detail checkout yang dapat langsung dikirim buyer.
export function createWhatsAppCheckoutUrl(template: WhatsAppCheckoutTemplate) {
  const normalizedPhone = normalizeWhatsAppNumber(template.phoneNumber);
  const safePrice = Number.isFinite(template.price) ? template.price : 0;
  const safeQuantity =
    typeof template.quantity === "number" && template.quantity > 0
      ? template.quantity
      : undefined;
  const total = safeQuantity ? safePrice * safeQuantity : safePrice;
  const buyerName = template.buyerName?.trim() || "Calon pembeli";
  const details = [
    `Nama: ${buyerName}`,
    `${template.itemLabel}: ${template.itemName}`,
    template.optionLabel && template.optionValue
      ? `${template.optionLabel}: ${template.optionValue}`
      : null,
    `Harga: ${formatCheckoutPrice(safePrice)}`,
    safeQuantity ? `Jumlah: ${safeQuantity}` : null,
    safeQuantity ? `Total: ${formatCheckoutPrice(total)}` : null,
    template.itemUrl
      ? `Link ${template.itemLabel.toLowerCase()}: ${template.itemUrl}`
      : null,
  ].filter(Boolean);
  const message = ["Halo, saya ingin checkout.", "", ...details].join("\n");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
