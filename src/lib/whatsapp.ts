import { DEVICE_LABELS, STATUS_LABELS, formatTL } from "@/lib/format";

/**
 * Türkiye numaralarını WhatsApp biçimine çevirir (905551234567).
 * 0555 123 45 67, 555 123 45 67, +90 555 123 45 67, 0090... hepsi kabul edilir.
 * Geçerli görünmüyorsa null döner.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "90" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("5")) return "90" + digits;
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith("0")) return digits; // yurt dışı numara
  return null;
}

export function whatsappLink(phone: string | null | undefined, message?: string) {
  const number = whatsappNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}

type OrderInfo = {
  number: string;
  deviceType: keyof typeof DEVICE_LABELS;
  brand: string | null;
  model: string | null;
  status: keyof typeof STATUS_LABELS;
  diagnosis: string | null;
  plannedWork: string | null;
  estimatedPrice: string | null;
  finalPrice: string | null;
};

const SIGN = "\n\nÇelik Bobinaj";

function device(order: OrderInfo) {
  const name = [order.brand, order.model].filter(Boolean).join(" ");
  return name ? `${name} (${DEVICE_LABELS[order.deviceType].toLowerCase()})` : DEVICE_LABELS[order.deviceType].toLowerCase();
}

/** İş emri için hazır WhatsApp mesajları. Mesajlar göndermeden önce düzenlenebilir. */
export function orderMessages(customer: string, order: OrderInfo) {
  const hello = `Merhaba ${customer},`;
  const ready = `${hello} ${order.number} numaralı ${device(order)} cihazınız teslime hazırdır. Mesai saatleri içinde teslim alabilirsiniz.`
    + (order.finalPrice ? ` Toplam tutar: ${formatTL(order.finalPrice)}.` : "") + SIGN;

  const parts = [
    order.diagnosis ? `Arıza tespiti: ${order.diagnosis}` : null,
    order.plannedWork ? `Yapılacak işlem: ${order.plannedWork}` : null,
    order.estimatedPrice ? `Tahmini ücret: ${formatTL(order.estimatedPrice)}` : null,
  ].filter(Boolean);
  const approval = `${hello} ${order.number} numaralı ${device(order)} cihazınızı inceledik.`
    + (parts.length ? `\n${parts.join("\n")}` : "")
    + `\nİşleme başlamamız için onayınızı rica ederiz.` + SIGN;

  const status = `${hello} ${order.number} numaralı ${device(order)} cihazınızın durumu: ${STATUS_LABELS[order.status]}.` + SIGN;

  return [
    { key: "hazir", label: "Teslime hazır", text: ready, recommended: order.status === "teslime_hazir" || order.status === "tamamlandi" },
    { key: "onay", label: "Fiyat ve onay isteği", text: approval, recommended: order.status === "ariza_tespit_edildi" || order.status === "musteri_onayi_bekliyor" },
    { key: "durum", label: "Durum bilgisi", text: status, recommended: false },
  ];
}
