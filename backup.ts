import { asc, getTableName, gt, and, notLike, sql, is, type SQL } from "drizzle-orm";
import { PgTable, getTableConfig, type PgColumn } from "drizzle-orm/pg-core";
import { getTableColumns } from "drizzle-orm";
import * as schema from "../db/schema";

/**
 * Yedek biçimi: satır satır JSON (NDJSON).
 *   1. satır : { tur, surum, tarih, fotografIcerigi }
 *   sonraki  : { tablo, satirlar: [...] }   (bağımlılık sırasına göre)
 *   son satır: { bitti: true }               (yarım inen dosyayı anlamak için)
 * Tablolar şemadan otomatik bulunur; ileride eklenen tablolar yedeğe kendiliğinden girer.
 */

export const BACKUP_KIND = "celik-bobinaj-yedek";
export const BACKUP_VERSION = 1;

// Yedeğe alınmayan tablolar (geçici veri)
const SKIP = new Set(["giris_denemeleri"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTable = PgTable<any>;
export type BackupDb = {
  execute: (query: SQL) => Promise<{ rows: Record<string, unknown>[] }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert: (table: any) => any;
};

/** Yabancı anahtar bağımlılığına göre sıralı tablo listesi (önce ebeveynler). */
export function orderedTables(): AnyTable[] {
  const all = (Object.values(schema as Record<string, unknown>).filter((v) => is(v, PgTable)) as unknown as AnyTable[])
    .filter((t) => !SKIP.has(getTableName(t)));
  const byName = new Map(all.map((t) => [getTableName(t), t]));
  const deps = new Map<string, Set<string>>();
  for (const t of all) {
    const set = new Set<string>();
    for (const fk of getTableConfig(t).foreignKeys) {
      const parent = getTableName(fk.reference().foreignTable);
      if (parent !== getTableName(t) && byName.has(parent)) set.add(parent);
    }
    deps.set(getTableName(t), set);
  }
  const result: AnyTable[] = [];
  const done = new Set<string>();
  while (result.length < all.length) {
    const next = all.find((t) => !done.has(getTableName(t)) && [...deps.get(getTableName(t))!].every((d) => done.has(d)));
    if (!next) throw new Error("Tablo bağımlılıkları sıralanamadı (döngü).");
    result.push(next);
    done.add(getTableName(next));
  }
  return result;
}

function idColumn(table: AnyTable): PgColumn | undefined {
  return (getTableColumns(table) as Record<string, PgColumn>).id;
}

async function* backupLines(db: BackupDb, withPhotos: boolean): AsyncGenerator<string> {
  yield JSON.stringify({ tur: BACKUP_KIND, surum: BACKUP_VERSION, tarih: new Date().toISOString(), fotografIcerigi: withPhotos }) + "\n";
  for (const table of orderedTables()) {
    const id = idColumn(table);
    if (!id) throw new Error(`${getTableName(table)} tablosunda id sütunu yok; yedeklenemez.`);
    const isPhotos = getTableName(table) === "fotograflar";
    const size = isPhotos ? 20 : 500; // fotoğraf satırları büyük olabilir
    let last = 0;
    for (;;) {
      let where: SQL | undefined = gt(id, last);
      if (isPhotos && !withPhotos) {
        // Fotoğrafsız yedekte veritabanında duran fotoğraf içerikleri atlanır; Blob adresleri kalır.
        where = and(where, notLike((table as unknown as { url: PgColumn }).url, "data:%"));
      }
      const rows: Record<string, unknown>[] = await db.select().from(table).where(where).orderBy(asc(id)).limit(size);
      if (rows.length === 0) break;
      yield JSON.stringify({ tablo: getTableName(table), satirlar: rows }) + "\n";
      last = rows[rows.length - 1].id as number;
    }
  }
  yield JSON.stringify({ bitti: true }) + "\n";
}

/** Tarayıcıya akıtılacak yedek akışı (bellek şişmez, 4,5 MB yanıt sınırına takılmaz). */
export function createBackupStream(db: BackupDb, options: { withPhotos: boolean }) {
  const encoder = new TextEncoder();
  const lines = backupLines(db, options.withPhotos);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await lines.next();
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await lines.return(undefined);
    },
  });
}

/** Dosyayı baştan sona doğrular: başlık, JSON bütünlüğü ve bitiş satırı. Tablo başına satır sayısını döndürür. */
export async function inspectBackup(lines: AsyncIterable<string>) {
  const counts = new Map<string, number>();
  let header: { tur?: string; surum?: number; tarih?: string; fotografIcerigi?: boolean } | null = null;
  let finished = false;
  let n = 0;
  for await (const line of lines) {
    if (!line.trim()) continue;
    n++;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line);
    } catch {
      throw new Error(`Yedek dosyası bozuk: ${n}. satır okunamadı.`);
    }
    if (n === 1) {
      if (data.tur !== BACKUP_KIND) throw new Error("Bu dosya bir Çelik Bobinaj yedeği değil.");
      if (data.surum !== BACKUP_VERSION) throw new Error(`Desteklenmeyen yedek sürümü: ${String(data.surum)}.`);
      header = data;
    } else if (data.bitti === true) finished = true;
    else if (typeof data.tablo === "string" && Array.isArray(data.satirlar)) {
      counts.set(data.tablo, (counts.get(data.tablo) ?? 0) + data.satirlar.length);
    }
  }
  if (!header) throw new Error("Yedek dosyası boş.");
  if (!finished) throw new Error("Yedek dosyası yarım kalmış (bitiş satırı yok). Yeniden indirip deneyin.");
  return { header, counts };
}

function reviveRow(table: AnyTable, row: Record<string, unknown>) {
  const out = { ...row };
  for (const [key, column] of Object.entries(getTableColumns(table) as Record<string, PgColumn>)) {
    const value = out[key];
    if (column.dataType === "date" && typeof value === "string") out[key] = new Date(value);
  }
  return out;
}

/**
 * Yedeği geri yükler. DİKKAT: önce yedeklenen tablolardaki tüm mevcut veriyi siler.
 * Çağıran, dosyayı daha önce inspectBackup ile doğrulamış olmalıdır.
 */
export async function restoreBackup(db: BackupDb, lines: AsyncIterable<string>, log: (m: string) => void = () => {}) {
  const tables = orderedTables();
  const byName = new Map(tables.map((t) => [getTableName(t), t]));
  const names = tables.map((t) => `"${getTableName(t)}"`).join(", ");
  await db.execute(sql.raw(`truncate table ${names}, "giris_denemeleri" restart identity cascade`));
  log("Mevcut veri temizlendi.");

  const totals = new Map<string, number>();
  let first = true;
  for await (const line of lines) {
    if (!line.trim()) continue;
    if (first) { first = false; continue; }
    const data = JSON.parse(line) as { tablo?: string; satirlar?: Record<string, unknown>[]; bitti?: boolean };
    if (!data.tablo || !data.satirlar) continue;
    const table = byName.get(data.tablo);
    if (!table) { log(`Atlandı (tanınmayan tablo): ${data.tablo}`); continue; }
    if (data.satirlar.length === 0) continue;
    await db.insert(table).values(data.satirlar.map((r) => reviveRow(table, r)));
    totals.set(data.tablo, (totals.get(data.tablo) ?? 0) + data.satirlar.length);
  }

  // Elle id verilen kayıtlar sonrası sıra sayaçlarını güncelle
  for (const table of tables) {
    if (!idColumn(table)) continue;
    const name = getTableName(table);
    await db.execute(sql.raw(
      `select setval(pg_get_serial_sequence('${name}', 'id'), greatest(coalesce(max(id), 0), 1), max(id) is not null) from "${name}"`,
    ));
  }
  for (const [name, count] of totals) log(`${name}: ${count} satır`);
  return totals;
}
