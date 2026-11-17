import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { createBackupStream, inspectBackup, restoreBackup, orderedTables } from "../src/lib/backup";
import { loginKeys, lockedMinutes, recordFailure, clearAttempts, USER_LIMIT, IP_LIMIT } from "../src/lib/login-guard";
import { getTableName } from "drizzle-orm";

let failed = 0;
function check(name: string, ok: boolean, extra = "") {
  console.log(`${ok ? "OK  " : "HATA"} ${name}${extra ? " — " + extra : ""}`);
  if (!ok) failed++;
}

async function fresh() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  return db;
}
async function collect(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader(); const dec = new TextDecoder(); let out = "";
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}
async function* toLines(text: string) { for (const l of text.split("\n")) yield l; }

(async () => {
  // 1) Tüm migration'lar temiz veritabanında
  const db = await fresh();
  const tables = await db.execute(sql`select count(*)::int as n from information_schema.tables where table_schema='public'`);
  check("9 migration temiz veritabanında çalıştı", true, `${tables.rows[0].n} tablo`);
  const wires = await db.execute(sql`select count(*)::int as n from stok_urunleri where kategori='emaye_bakir_tel'`);
  check("0003 migration tel stoklarını ekledi", Number(wires.rows[0].n) === 39, `${wires.rows[0].n} tel`);

  // 2) Örnek veri
  const [user] = await db.insert(schema.users).values({ username: "admin", fullName: "Yönetici", passwordHash: "hash", role: "yonetici" }).returning();
  const [cust] = await db.insert(schema.customers).values({ name: "Deneme Ltd", phone: "0555" }).returning();
  const [order] = await db.insert(schema.workOrders).values({ number: "CB-2026-00001", customerId: cust.id, deviceType: "motor", brand: "Siemens", estimatedPrice: "1500.00", createdBy: user.id }).returning();
  const [w1] = await db.insert(schema.windingRecords).values({ workOrderId: order.id, customerId: cust.id, brand: "Siemens", sipir: "42", hatve: "1-8", hiw: "eski" }).returning();
  const [w2] = await db.insert(schema.windingRecords).values({ customerId: cust.id, copiedFromId: w1.id, brand: "Siemens", sipir: "42" }).returning();
  await db.insert(schema.payments).values({ customerId: cust.id, workOrderId: order.id, amount: "500.00", method: "nakit", userId: user.id });
  await db.insert(schema.photos).values([
    { url: "data:image/jpeg;base64,/9j/AAAA", kind: "ilk_gelis", windingRecordId: w1.id },
    { url: "https://abc123.public.blob.vercel-storage.com/fotograf/1-xyz.jpg", kind: "genel", workOrderId: order.id },
  ]);
  await db.insert(schema.expenses).values({ category: "kira", amount: "3000.00" });

  // 3) Giriş kilidi
  const ex = db as never;
  const k = loginKeys("Admin", "1.2.3.4");
  for (let i = 1; i < USER_LIMIT; i++) await recordFailure(ex, k.user, USER_LIMIT);
  check("4 hatadan sonra kilit yok", (await lockedMinutes(ex, [k.user, k.ip])) === null);
  const lockedNow = await recordFailure(ex, k.user, USER_LIMIT);
  check("5. hatada kilit başladı", lockedNow === 15, `kalan ${lockedNow} dk`);
  check("kilit sorgusu çalışıyor", (await lockedMinutes(ex, [k.user, k.ip])) === 15);
  const other = loginKeys("admin", "9.9.9.9");
  check("başka IP'deki aynı kullanıcı kilitli değil", (await lockedMinutes(ex, [other.user, other.ip])) === null);
  await clearAttempts(ex, k.user);
  check("başarılı giriş sayacı sıfırladı", (await lockedMinutes(ex, [k.user])) === null);
  for (let i = 0; i < IP_LIMIT; i++) await recordFailure(ex, k.ip, IP_LIMIT);
  check("IP bazlı kilit (30 hata)", (await lockedMinutes(ex, [k.ip])) === 15);
  await db.execute(sql`update giris_denemeleri set pencere_basi = now() - interval '20 minutes', kilit_bitis = null where anahtar = ${k.ip}`);
  const afterWindow = await recordFailure(ex, k.ip, IP_LIMIT);
  const row = await db.execute(sql`select deneme from giris_denemeleri where anahtar = ${k.ip}`);
  check("süre dolunca sayaç 1'den başlar", afterWindow === null && Number(row.rows[0].deneme) === 1);

  // 4) Yedek akışı
  const full = await collect(createBackupStream(db as never, { withPhotos: true }));
  const slim = await collect(createBackupStream(db as never, { withPhotos: false }));
  const info = await inspectBackup(toLines(full));
  const infoSlim = await inspectBackup(toLines(slim));
  check("yedek dosyası doğrulandı", info.counts.get("musteriler") === 1 && info.counts.get("bobinaj_kayitlari") === 2);
  check("giris_denemeleri yedeğe girmedi", !info.counts.has("giris_denemeleri"));
  check("fotoğraflı yedekte 2 fotoğraf", info.counts.get("fotograflar") === 2);
  check("fotoğrafsız yedekte yalnız Blob kaydı", infoSlim.counts.get("fotograflar") === 1);
  let truncated = false;
  try { await inspectBackup(toLines(full.split("\n").slice(0, -2).join("\n"))); } catch { truncated = true; }
  check("yarım inen dosya reddedildi", truncated);

  // 5) Başka bir temiz veritabanına geri yükleme
  const db2 = await fresh();
  await db2.insert(schema.customers).values({ name: "SİLİNMELİ" }); // truncate yolunu da dene
  await restoreBackup(db2 as never, toLines(full));
  let same = true; const diffs: string[] = [];
  for (const t of orderedTables()) {
    const name = getTableName(t);
    const a = JSON.stringify((await db.execute(sql.raw(`select * from "${name}" order by 1`))).rows);
    const b = JSON.stringify((await db2.execute(sql.raw(`select * from "${name}" order by 1`))).rows);
    if (a !== b) { same = false; diffs.push(name); }
  }
  check("geri yüklenen veri birebir aynı", same, diffs.join(", "));
  const [newCust] = await db2.insert(schema.customers).values({ name: "Yeni" }).returning();
  check("geri yükleme sonrası sıra sayacı doğru", newCust.id === cust.id + 1, `yeni id ${newCust.id}`);
  const copy = await db2.select().from(schema.windingRecords).where(eq(schema.windingRecords.id, w2.id));
  check("kopya kaydın kaynak bağı korundu", copy[0].copiedFromId === w1.id);

  console.log(failed ? `\n${failed} TEST BAŞARISIZ` : "\nTÜM TESTLER GEÇTİ");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("TEST ÇÖKTÜ:", e); process.exit(2); });
