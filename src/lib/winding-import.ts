import { decimal, recordId } from "./record-input";

/**
 * Eski bobinaj defteri kayıtlarını CSV'den içeri alma — saf (veritabanına dokunmayan) kısım:
 * dosyayı çözme, CSV ayrıştırma, sütun eşleme ve satır doğrulama.
 * HİW sütunu bilerek içeri alınmaz.
 */

export const MAX_ROWS = 2000;
export const MAX_BYTES = 2 * 1024 * 1024;

export function decodeCsv(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1254").decode(bytes); // eski Excel dosyaları
  }
  return text.replace(/^﻿/, "");
}

/** Ayırıcıyı (; , sekme) başlık satırından bulur; tırnaklı alanları ve alan içi satır sonlarını destekler. */
export function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts = [";", ",", "\t"].map(ch => [ch, firstLine.split(ch).length - 1] as const);
  const delimiter = counts.reduce((best, cur) => (cur[1] > best[1] ? cur : best), [";", 0] as readonly [string, number])[0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const endField = () => { row.push(field); field = ""; };
  const endRow = () => {
    endField();
    if (row.some(cell => cell.trim() !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) endField();
    else if (ch === "\n") endRow();
    else if (ch === "\r") { if (text[i + 1] !== "\n") endRow(); }
    else field += ch;
  }
  if (field !== "" || row.length) endRow();
  return rows;
}

function norm(value: string) {
  return value.toLocaleLowerCase("tr").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/[^a-z0-9]/g, "");
}

export function customerKey(name: string) {
  return name.toLocaleLowerCase("tr").trim().replace(/\s+/g, " ");
}

const TEXT_COLUMNS: Record<string, string> = {
  marka: "brand", model: "model", serino: "serialNo", serinumarasi: "serialNo", seri: "serialNo",
  volt: "volt", voltaj: "volt", faz: "phase", frekans: "frequency", hz: "frequency",
  baglantitipi: "connectionType", govdeolcusu: "frameSize", govde: "frameSize",
  hvc: "hvc", sipir: "sipir", hatve: "hatve", kalip: "mold",
  olukbilgileri: "slotInfo", olukbilgisi: "slotInfo", sarimbaglantisi: "windingConnection",
  sarimsekli: "windingShape", izolasyonbilgileri: "insulation", izolasyon: "insulation",
  teknikaciklamalar: "notes", aciklama: "notes", notlar: "notes", not: "notes",
};
const INT_COLUMNS: Record<string, string> = {
  rpm: "rpm", devir: "rpm", kutupsayisi: "poleCount", kutup: "poleCount", oluksayisi: "slotCount",
  paraleltelsayisi: "parallelWires", paralel: "parallelWires", bobinsayisi: "coilCount", bobin: "coilCount",
};
const POWER_COLUMNS: Record<string, string> = { kw: "kw", hp: "hp" };
const MULTILINE = new Set(["slotInfo", "insulation", "notes"]);
const CUSTOMER_COLUMNS = new Set(["musteri", "musteriadi", "firma", "adsoyad", "adfirma"]);
const PHONE_COLUMNS = new Set(["telefon", "telefonno", "gsm", "cep"]);
const DATE_COLUMNS = new Set(["tarih", "kayittarihi"]);

type Column =
  | { kind: "customer" | "phone" | "date" | "ignored"; header: string }
  | { kind: "text" | "int" | "power"; header: string; key: string }
  | { kind: "wire"; header: string; index: number };

function classify(header: string): Column | null {
  const n = norm(header);
  if (!n) return null;
  if (n === "hiw") return { kind: "ignored", header };
  if (CUSTOMER_COLUMNS.has(n)) return { kind: "customer", header };
  if (PHONE_COLUMNS.has(n)) return { kind: "phone", header };
  if (DATE_COLUMNS.has(n)) return { kind: "date", header };
  if (TEXT_COLUMNS[n]) return { kind: "text", header, key: TEXT_COLUMNS[n] };
  if (INT_COLUMNS[n]) return { kind: "int", header, key: INT_COLUMNS[n] };
  if (POWER_COLUMNS[n]) return { kind: "power", header, key: POWER_COLUMNS[n] };
  const wire = n.match(/^telcapi(\d{1,2})?(mm)?$/) ?? n.match(/^tel(\d{1,2})(mm)?$/);
  if (wire) return { kind: "wire", header, index: Number(wire[1] ?? 1) };
  return { kind: "ignored", header: `?${header}` };
}

export type ParsedRow = {
  line: number;
  customerName: string | null;
  customerKey: string | null;
  phone: string | null;
  createdAt: Date | null;
  values: Record<string, string | number | null>;
  wires: string[];
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: { line: number; message: string }[];
  warnings: string[];
  recognized: string[];
};

function parseDate(raw: string): Date | null | "hata" {
  if (!raw) return null;
  const m = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/) ?? raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "hata";
  const [y, mo, d] = m[0].includes("-") && m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = new Date(`${iso}T12:00:00+03:00`);
  if (!Number.isFinite(date.valueOf()) || date.toISOString().slice(0, 10) !== iso && new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) return "hata";
  return date;
}

export function mapRows(table: string[][]): ParseResult {
  const warnings: string[] = [];
  const errors: { line: number; message: string }[] = [];
  if (table.length === 0) return { rows: [], errors: [{ line: 1, message: "Dosya boş." }], warnings, recognized: [] };

  const columns = table[0].map(h => classify(h.trim()));
  const recognized: string[] = [];
  const unknown: string[] = [];
  columns.forEach((c, i) => {
    if (!c) return;
    if (c.kind === "ignored") {
      if (c.header.startsWith("?")) unknown.push(c.header.slice(1));
      else warnings.push(`"${c.header}" sütunu bu sistemde kullanılmadığı için atlandı.`);
    } else recognized.push(table[0][i].trim());
  });
  if (unknown.length) warnings.push(`Tanınmayan sütunlar atlandı: ${unknown.join(", ")}`);
  if (!columns.some(c => c && c.kind !== "ignored" && c.kind !== "customer" && c.kind !== "phone" && c.kind !== "date")) {
    return { rows: [], errors: [{ line: 1, message: "Başlık satırında tanınan teknik sütun yok. Şablon dosyasındaki başlıkları kullanın." }], warnings, recognized };
  }
  if (table.length - 1 > MAX_ROWS) {
    return { rows: [], errors: [{ line: 1, message: `Tek seferde en fazla ${MAX_ROWS} satır aktarılabilir. Dosyayı bölün.` }], warnings, recognized };
  }

  const rows: ParsedRow[] = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const cell = (i: number) => (cells[i] ?? "").trim();
    const problems: string[] = [];
    const row: ParsedRow = { line, customerName: null, customerKey: null, phone: null, createdAt: null, values: {}, wires: [] };
    const wireByIndex = new Map<number, string>();
    let technical = 0;

    columns.forEach((c, i) => {
      if (!c || c.kind === "ignored") return;
      const raw = cell(i);
      if (!raw) return;
      if (c.kind === "customer") {
        row.customerName = raw.replace(/\s+/g, " ").slice(0, 200);
        row.customerKey = customerKey(raw);
      } else if (c.kind === "phone") row.phone = raw.slice(0, 50);
      else if (c.kind === "date") {
        const d = parseDate(raw);
        if (d === "hata") problems.push(`${c.header}: "${raw}" geçerli bir tarih değil (gg.aa.yyyy yazın).`);
        else row.createdAt = d;
      } else if (c.kind === "text") {
        row.values[c.key] = raw.slice(0, MULTILINE.has(c.key) ? 5000 : 300);
        technical++;
      } else if (c.kind === "int") {
        const cleaned = /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replaceAll(".", "") : raw;
        const value = recordId(cleaned);
        if (value === null) problems.push(`${c.header}: "${raw}" pozitif bir tam sayı olmalı.`);
        else { row.values[c.key] = value; technical++; }
      } else if (c.kind === "power") {
        const value = decimal(raw, 7, 3);
        if (value === null) problems.push(`${c.header}: "${raw}" geçerli bir sayı değil.`);
        else { row.values[c.key] = value; technical++; }
      } else if (c.kind === "wire") {
        const value = decimal(raw, 3, 3);
        const n = value === null ? NaN : Number(value);
        if (value === null || n < 0.05 || n > 10) problems.push(`${c.header}: "${raw}" geçerli bir tel çapı değil (0,05 – 10 mm arası).`);
        else { wireByIndex.set(c.index, String(n)); technical++; }
      }
    });

    row.wires = [...wireByIndex.entries()].sort(([a], [b]) => a - b).map(([, v]) => v).slice(0, 10);
    if (technical === 0 && problems.length === 0) problems.push("Satırda teknik bilgi yok (marka, sipir, tel çapı vb. hepsi boş).");
    if (problems.length) problems.forEach(message => errors.push({ line, message }));
    else rows.push(row);
  });
  return { rows, errors, warnings, recognized };
}

/** Şablon dosyası: Excel'in Türkçe sürümüyle doğrudan açılır (noktalı virgül + UTF-8 BOM). */
export const TEMPLATE_HEADERS = [
  "Müşteri", "Telefon", "Tarih", "Marka", "Model", "Seri No", "kW", "HP", "Volt", "Faz", "RPM", "Frekans",
  "Kutup sayısı", "Oluk sayısı", "Bağlantı tipi", "Gövde ölçüsü", "HVC", "Sipir", "Hatve", "Kalıp",
  "Tel çapı 1 (mm)", "Tel çapı 2 (mm)", "Tel çapı 3 (mm)", "Paralel tel sayısı", "Bobin sayısı",
  "Oluk bilgileri", "Sarım bağlantısı", "Sarım şekli", "İzolasyon bilgileri", "Teknik açıklamalar",
];
export const TEMPLATE_EXAMPLE = [
  "Ahmet Yılmaz", "0555 123 45 67", "12.03.2024", "Siemens", "1LA7 090-4AA", "", "1,5", "2", "380", "3", "1450", "50",
  "4", "36", "Yıldız", "90S", "", "42", "1-8", "K-12",
  "0,90", "", "", "2", "12",
  "", "", "", "", "Örnek satır - silip kendi kayıtlarınızı yazın",
];
