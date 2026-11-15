"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { decimal, field, recordId } from "@/lib/record-input";

export async function saveSupplier(id: number | null, _: string | null, form: FormData) {
  await requireUser("usta");
  const name = field(form, "name");
  if (!name || name.length > 300) return "Geçerli bir tedarikçi adı girin.";
  const data = { name, phone: field(form, "phone").slice(0, 300), address: field(form, "address").slice(0, 5000),
    notes: field(form, "notes").slice(0, 5000) };
  const db = getDb();
  try {
    if (id) await db.update(schema.suppliers).set(data).where(eq(schema.suppliers.id, id));
    else await db.insert(schema.suppliers).values(data);
  } catch { return "Tedarikçi kaydedilemedi."; }
  redirect("/stok");
}

export async function saveStock(id: number | null, _: string | null, form: FormData) {
  const user = await requireUser("usta");
  const name = field(form, "name");
  const unit = field(form, "unit");
  const category = schema.stockCategoryEnum.enumValues.find(value => value === field(form, "category"));
  const buyPrice = decimal(field(form, "buyPrice") || "0", 10, 2);
  const sellPrice = decimal(field(form, "sellPrice") || "0", 10, 2);
  const minQuantity = decimal(field(form, "minQuantity") || "0", 9, 3);
  const diameter = field(form, "wireDiameter");
  const wireDiameter = decimal(diameter, 3, 3);
  if (!name || !unit || !category || !buyPrice || !sellPrice || !minQuantity || (diameter && !wireDiameter)) {
    return "Ürün adı, birim, kategori ve sayısal değerleri kontrol edin.";
  }
  const data = { name: name.slice(0, 300), unit: unit.slice(0, 50), category, buyPrice, sellPrice, minQuantity, wireDiameter,
    supplierId: recordId(field(form, "supplierId")), active: form.has("active") };
  const db = getDb();
  try {
    if (id) await db.batch([
      db.update(schema.stockItems).set(data).where(eq(schema.stockItems.id, id)),
      db.insert(schema.activityLogs).values({ userId: user.uid, entity: "stok", entityId: id, action: "guncelle" }),
    ]);
    else await db.insert(schema.stockItems).values(data);
  } catch { return "Ürün kaydedilemedi."; }
  redirect("/stok");
}

export async function moveStock(orderId: number | null, _: string | null, form: FormData) {
  const user = await requireUser(orderId ? "personel" : "usta");
  const stockId = recordId(field(form, "stockId"));
  const quantity = decimal(field(form, "quantity"), 9, 3);
  const type = orderId ? "cikis" : schema.stockMovementTypeEnum.enumValues.find(value => value === field(form, "type"));
  const note = field(form, "note").slice(0, 5000) || null;
  if (!stockId || !quantity || !type || (Number(quantity) === 0 && type !== "sayim_duzeltme")) return "Ürün, miktar ve hareket türünü kontrol edin.";

  try {
    const result = await getDb().execute(sql`
      with job as materialized (
        select id from is_emirleri where id = ${orderId} and durum not in ('iptal_edildi', 'teslim_edildi') for update
      ), stock as materialized (
        select id, mevcut_miktar, satis_fiyati, alis_fiyati from stok_urunleri
        where id = ${stockId} and aktif and (${orderId}::integer is null or exists (select 1 from job)) for update
      ), delta as (
        select *, case ${type} when 'sayim_duzeltme' then ${quantity}::numeric - mevcut_miktar
          when 'cikis' then -${quantity}::numeric else ${quantity}::numeric end as change from stock
      ), balance as (
        update stok_urunleri s set mevcut_miktar = d.mevcut_miktar + d.change from delta d
        where s.id = d.id and d.mevcut_miktar + d.change between 0 and 999999999.999 and d.change <> 0
        returning s.id, d.change, d.satis_fiyati, d.alis_fiyati
      ), items as (
        insert into is_emri_malzemeleri (is_emri_id, stok_id, miktar, birim_fiyat)
        select job.id, balance.id, -balance.change, balance.satis_fiyati from job cross join balance
      ), movement as (
        insert into stok_hareketleri (stok_id, tur, miktar, birim_fiyat, is_emri_id, "not", kullanici_id)
        select id, ${type}::stok_hareket_turu, change, case when change > 0 then alis_fiyati else satis_fiyati end,
          ${orderId}, ${note}, ${user.uid} from balance returning id
      )
      insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${user.uid}, 'olustur', 'stok_hareketi', id from movement returning id
    `);
    if (!result.rows.length) return "Miktar değişmedi, stok yetersiz veya seçilen kayıt kullanılamıyor.";
  } catch (error) {
    console.error("Stok hareketi kaydedilemedi", error);
    return "Stok hareketi kaydedilemedi.";
  }
  redirect(orderId ? `/is-emirleri/${orderId}` : "/stok");
}
