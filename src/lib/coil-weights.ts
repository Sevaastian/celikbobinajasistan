/** Bobin gramları: toplam gram / kilo hesabı (tek yerde, ekran ve sunucu aynı sonucu bulsun). */
export function sumGrams(values: (string | number | null | undefined)[]) {
  // Binde bir gram hassasiyetle topla (kayan nokta hatası olmasın).
  const tenths = values.reduce<number>((total, value) => total + Math.round(Number(value ?? 0) * 10), 0);
  return tenths / 10;
}

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
const kg = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function formatGrams(grams: number) { return `${nf.format(grams)} g`; }
export function formatKilos(grams: number) { return `${kg.format(grams / 1000)} kg`; }
