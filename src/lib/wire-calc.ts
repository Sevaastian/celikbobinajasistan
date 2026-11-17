import { wireSizes } from "./wire-sizes";

/** Bakır tel hesapları. Hepsi yaklaşık değerdir: emaye kalınlığı, oluk doluluğu ve sarım şekli hesaba katılmaz. */
export const COPPER_DENSITY = 8.96; // g/cm³  →  1 mm² kesitli 1 m tel ≈ 8,96 g

export const area = (diameter: number) => Math.PI * diameter * diameter / 4;
export const diameterFor = (a: number) => Math.sqrt(4 * a / Math.PI);

export type Combo = { label: string; area: number; diffPercent: number };

const mm = (value: number) => value.toFixed(2).replace(".", ",");

/** Hedef kesite (mm²) %tolerans içinde yaklaşan standart tel kombinasyonları (en yakından başlayarak). */
export function wireCombos(target: number, tolerancePercent = 4, limit = 10, exclude?: string): Combo[] {
  const sizes = wireSizes.map(Number);
  const found = new Map<string, Combo>();
  const add = (parts: [number, number][]) => {
    const total = parts.reduce((sum, [count, d]) => sum + count * area(d), 0);
    const diff = (total - target) / target * 100;
    if (Math.abs(diff) > tolerancePercent) return;
    const label = parts.map(([count, d]) => (count > 1 ? `${count} × ` : "") + `${mm(d)}`).join(" + ") + " mm";
    found.set(label, { label, area: total, diffPercent: diff });
  };
  for (const d of sizes) for (let n = 1; n <= 4; n++) add([[n, d]]);
  for (let i = 0; i < sizes.length; i++) for (let j = i + 1; j < sizes.length; j++) {
    if (sizes[i] >= sizes[j] * 0.5) add([[1, sizes[i]], [1, sizes[j]]]); // iki farklı çapta birer tel (çok ince tel anlamsız)
  }
  if (exclude) found.delete(exclude);
  return [...found.values()].sort((x, y) => Math.abs(x.diffPercent) - Math.abs(y.diffPercent)).slice(0, limit);
}

/** Aynı sargı farklı gerilimde: sipir gerilimle doğru, tel kesiti ters orantılı değişir (aynı güç varsayımı). */
export function voltageChange(turns: number, volt1: number, volt2: number, diameter: number) {
  return { turns: turns * volt2 / volt1, diameter: diameterFor(area(diameter) * volt1 / volt2) };
}

/** Tel gramından metre (tek tel). */
export const metersFromGrams = (grams: number, diameter: number) => grams / (COPPER_DENSITY * area(diameter));
