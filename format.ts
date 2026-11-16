/** Türkiye biçimleri: 1.234,50 ₺ ve 14.11.2026 */

const tl = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
export function formatTL(value: string | number | null | undefined) {
  return tl.format(Number(value ?? 0));
}

const dateFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});
const dateTimeFmt = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Istanbul",
});

export function formatDate(value: Date | string | null | undefined) {
  return value ? dateFmt.format(new Date(value)) : "—";
}
export function formatDateTime(value: Date | string | null | undefined) {
  return value ? dateTimeFmt.format(new Date(value)) : "—";
}

export const STATUS_LABELS: Record<string, string> = {
  yeni_geldi: "Yeni geldi",
  incelemede: "İncelemede",
  ariza_tespit_edildi: "Arıza tespit edildi",
  musteri_onayi_bekliyor: "Müşteri onayı bekliyor",
  islemde: "İşlemde",
  parca_bekliyor: "Parça bekliyor",
  test_asamasinda: "Test aşamasında",
  tamamlandi: "Tamamlandı",
  teslime_hazir: "Teslime hazır",
  teslim_edildi: "Teslim edildi",
  iptal_edildi: "İptal edildi",
};

export const DEVICE_LABELS: Record<string, string> = {
  motor: "Elektrik motoru",
  dalgic: "Dalgıç motor",
  su_motoru: "Su motoru",
  fan_motoru: "Fan motoru",
  alternator: "Alternatör",
  el_aleti: "El aleti",
  jenerator: "Jeneratör",
  pompa: "Pompa",
  diger: "Diğer",
};

/** Sarım (söküm ekranı ve bobinaj kaydı) yapılan cihaz türleri. */
export const WINDING_DEVICES = ["motor", "dalgic", "su_motoru", "fan_motoru", "alternator"] as const;
export function isWindingDevice(type: string | null | undefined) {
  return !!type && (WINDING_DEVICES as readonly string[]).includes(type);
}
