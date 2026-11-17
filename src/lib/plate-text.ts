/** Ücretsiz plaka okuma: OCR metninden motor plaka alanlarını ayıklar. Bulamadığını boş bırakır, tahmin etmez. */
export type PlateGuess = { brand?: string; model?: string; serialNo?: string; kw?: string; volt?: string; rpm?: string; poles?: string };

const BRANDS = ["Siemens", "ABB", "WEG", "Gamak", "Elmo", "Emsan", "Teco", "Nord", "SEW", "Leroy Somer", "Lenze", "Baldor", "Hyundai",
  "Grundfos", "Wilo", "Lowara", "Pedrollo", "Bosch", "Makita", "Aegmotor", "Marelli", "Mez", "Vem", "Cantoni", "Brook Crompton", "Crompton", "Kirloskar", "Aksa", "Mecc Alte", "Stamford", "Leroy-Somer"];

const toNum = (s: string) => s.replace(",", ".");

export function parsePlateText(raw: string): PlateGuess {
  const text = raw.replace(/[|_]/g, " ").replace(/[ \t]+/g, " ");
  const out: PlateGuess = {};

  const compact = text.toLowerCase().replace(/[^a-z]/g, "");
  const brand = BRANDS.find(b => compact.includes(b.toLowerCase().replace(/[^a-z]/g, "")));
  if (brand) out.brand = brand === "Leroy Somer" ? "Leroy-Somer" : brand;

  const kw = text.match(/(\d{1,3}(?:[.,]\d{1,3})?)\s*k\s?w\b/i);
  const hp = text.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:hp|ps|cv)\b/i);
  if (kw) out.kw = toNum(kw[1]);
  else if (hp) out.kw = String(Math.round(Number(toNum(hp[1])) * 0.7355 * 100) / 100);

  const rpmLabeled = text.match(/(\d{3,4})\s*(?:\/\s*min|min\s*-?\s*1|min|rpm|d\s*\/\s*d|devir)/i);
  let rpm = rpmLabeled ? Number(rpmLabeled[1]) : null;
  if (!rpm) { const bare = [...text.matchAll(/\b(\d{3,4})\b/g)].map(m => Number(m[1])).find(n => n >= 650 && n <= 3600 && ![380, 400, 415, 220, 230, 240].includes(n)); rpm = bare ?? null; }
  if (rpm && rpm >= 500 && rpm <= 3700) {
    out.rpm = String(rpm);
    out.poles = String(rpm >= 2400 ? 2 : rpm >= 1250 ? 4 : rpm >= 850 ? 6 : rpm >= 650 ? 8 : 10);
  }

  const volt = text.match(/\b(\d{3})\s*[\/-]\s*(\d{3})\s*v?\b/i) ?? text.match(/\b(\d{3})\s*v\b/i);
  if (volt) out.volt = volt[2] ? `${volt[1]}/${volt[2]}` : volt[1];

  const model = text.match(/(?:type|typ|tip|model)\s*[:.]?\s*([A-Z0-9][A-Z0-9 ./-]{3,24}[A-Z0-9])/i);
  if (model) out.model = model[1].trim().replace(/\s{2,}/g, " ").slice(0, 40);
  const serial = text.match(/(?:s\s*\/\s*n|ser(?:ial)?\.?\s*(?:no|nr|number)?|seri\s*no|no)\s*[:.]?\s*([A-Z0-9][A-Z0-9/-]{4,24})/i);
  if (serial) out.serialNo = serial[1].toUpperCase().slice(0, 40);
  return out;
}
