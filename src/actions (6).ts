"use server";

import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { customerKey, decodeCsv, mapRows, MAX_BYTES, parseCsv, type ParsedRow } from "@/lib/winding-import";

export type ImportState = {
  mode?: "onizle" | "aktar";
  fatal?: string;
  total?: number;
  valid?: number;
  newCustomers?: number;
  existingCustomers?: number;
  errors?: { line: number; message: string }[];
  warnings?: string[];
  sample?: { line: number; customer: string; motor: string; sipir: string; hatve: string; wires: string }[];
  imported?: number;
  createdCustomers?: number;
} | null;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

export async function importWindings(_prev: ImportState, form: FormData): Promise<ImportState> {
  const user = await requireUser("usta");
  const mode = form.get("mod") === "aktar" ? "aktar" : "onizle";
  const file = form.get("dosya");
  if (!(file instanceof File) || file.size === 0) return { mode, fatal: "Bir CSV dosyası seçin." };
  if (file.size > MAX_BYTES) return { mode, fatal: "Dosya çok büyük (en fazla 2 MB). Birkaç parçaya bölün." };

  const parsed = mapRows(parseCsv(decodeCsv(new Uint8Array(await file.arrayBuffer()))));
  if (parsed.rows.length === 0 && parsed.errors.length) {
    return { mode, fatal: parsed.errors.find(e => e.line === 1)?.message, errors: parsed.errors.slice(0, 50), warnings: parsed.warnings, total: parsed.errors.length };
  }

  const db = getDb();
  const { customers, windingRecords, activityLogs } = schema;
  const names = [...new Set(parsed.rows.map(r => r.customerName).filter((n): n is string => !!n))];
  const existing = new Map<string, number>();
  if (names.length) {
    const found = await db.select({ id: customers.id, name: customers.name }).from(customers);
    for (const c of found) existing.set(customerKey(c.name), c.id);
  }
  const keys = new Map<string, ParsedRow>();
  for (const row of parsed.rows) if (row.customerKey && !keys.has(row.customerKey) && !existing.has(row.customerKey)) keys.set(row.customerKey, row);

  const summary: ImportState = {
    mode, total: parsed.rows.length + parsed.errors.length, valid: parsed.rows.length,
    newCustomers: keys.size, existingCustomers: new Set(parsed.rows.map(r => r.customerKey).filter(k => k && existing.has(k))).size,
    errors: parsed.errors.slice(0, 50), warnings: parsed.warnings,
  };

  if (mode === "onizle") {
    summary.sample = parsed.rows.slice(0, 8).map(r => ({
      line: r.line, customer: r.customerName ?? "—",
      motor: [r.values.brand, r.values.model].filter(Boolean).join(" ") || "—",
      sipir: String(r.values.sipir ?? "—"), hatve: String(r.values.hatve ?? "—"), wires: r.wires.join(" / ") || "—",
    }));
    return summary;
  }

  if (parsed.errors.length) return { ...summary, fatal: "Hatalı satırlar var. Dosyayı düzeltip yeniden yükleyin; hiçbir kayıt aktarılmadı." };
  if (parsed.rows.length === 0) return { ...summary, fatal: "Aktarılacak satır yok." };

  try {
    const newRows = [...keys.values()];
    for (const part of chunk(newRows, 200)) {
      const created = await db.insert(customers).values(part.map(r => ({ name: r.customerName!, phone: r.phone }))).returning({ id: customers.id });
      part.forEach((r, i) => existing.set(r.customerKey!, created[i].id));
    }
    let imported = 0;
    for (const part of chunk(parsed.rows, 200)) {
      const inserted = await db.insert(windingRecords).values(part.map(r => {
        const [wireDiameter = null, secondWireDiameter = null, ...additionalWireDiameters] = r.wires;
        return {
          ...r.values, wireDiameter, secondWireDiameter, additionalWireDiameters,
          customerId: r.customerKey ? existing.get(r.customerKey) ?? null : null,
          createdBy: user.uid, ...(r.createdAt ? { createdAt: r.createdAt } : {}),
        } as typeof windingRecords.$inferInsert;
      })).returning({ id: windingRecords.id });
      imported += inserted.length;
    }
    await db.insert(activityLogs).values({ entity: "bobinaj", action: "toplu_aktar", userId: user.uid, details: { adet: imported, yeniMusteri: keys.size, dosya: file.name.slice(0, 100), author: user.name } });
    revalidatePath("/bobinaj");
    revalidatePath("/musteriler");
    return { ...summary, mode, imported, createdCustomers: keys.size };
  } catch (error) {
    console.error("Toplu bobinaj aktarımı başarısız", error);
    return { ...summary, fatal: "Aktarım sırasında bir hata oluştu. Bir kısım kayıt eklenmiş olabilir; Bobinaj listesini kontrol edin." };
  }
}
