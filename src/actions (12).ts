"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { decimal, field, parseLocalDateTime, recordId } from "@/lib/record-input";

export async function recordFinance(kind: "payment" | "expense", _: string | null, form: FormData) {
  const user = await requireUser("usta");
  const amount = decimal(field(form, "amount"), 10, 2);
  const method = schema.paymentMethodEnum.enumValues.find(value => value === field(form, "method"));
  const date = parseLocalDateTime(field(form, "date"));
  const note = field(form, "note").slice(0, 5000) || null;
  if (!amount || Number(amount) <= 0 || !method || !date) return "Pozitif tutar, ödeme yöntemi ve geçerli tarih girin.";
  try {
    const db = getDb();
    if (kind === "payment") {
      const customerId = recordId(field(form, "customerId"));
      const orderId = recordId(field(form, "orderId"));
      if (!customerId || (field(form, "orderId") && !orderId)) return "Müşteri ve iş emri seçimini kontrol edin.";
      const result = await db.execute(sql`
        with job as materialized (
          select id from is_emirleri where id = ${orderId} and musteri_id = ${customerId}
          and durum <> 'iptal_edildi' for update
        ), saved as (
          insert into tahsilatlar (musteri_id, is_emri_id, tutar, yontem, odeme_tarihi, "not", kullanici_id)
          select ${customerId}::integer, ${orderId}::integer, ${amount}::numeric, ${method}::odeme_yontemi, ${date.toISOString()}::timestamptz, ${note}::text, ${user.uid}::integer
          where ${orderId}::integer is null or exists (select 1 from job) returning id
        )
        insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
        select ${user.uid}, 'olustur', 'tahsilat', id from saved returning id
      `);
      if (!result.rows.length) return "İş emri seçilen müşteriye ait ve açık bir kayıt olmalıdır.";
    } else {
      const category = field(form, "category").slice(0, 300);
      const supplierId = recordId(field(form, "supplierId"));
      if (!category) return "Gider kategorisini girin.";
      await db.execute(sql`
        with saved as (
          insert into giderler (kategori, aciklama, tutar, yontem, tedarikci_id, gider_tarihi, kullanici_id)
          values (${category}, ${note}, ${amount}, ${method}::odeme_yontemi, ${supplierId}, ${date.toISOString()}, ${user.uid}) returning id
        )
        insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id) select ${user.uid}, 'olustur', 'gider', id from saved
      `);
    }
  } catch (error) {
    console.error("Finans işlemi kaydedilemedi", error);
    return "Finans işlemi kaydedilemedi.";
  }
  redirect("/finans");
}

export async function editFinance(kind: "payment" | "expense", id: number, _: string | null, form: FormData) {
  const user = await requireUser("yonetici");
  const amount = decimal(field(form, "amount"), 10, 2);
  const method = schema.paymentMethodEnum.enumValues.find(value => value === field(form, "method"));
  const date = parseLocalDateTime(field(form, "date"));
  const note = field(form, "note").slice(0, 5000) || null;
  if (!amount || Number(amount) <= 0 || !method || !date) return "Tutarı, tarihi ve ödeme yöntemini kontrol edin.";
  const db = getDb();
  const table = kind === "payment" ? schema.payments : schema.expenses;
  const details = kind === "payment" ? sql`odeme_tarihi = ${date.toISOString()}, "not" = ${note}`
    : sql`gider_tarihi = ${date.toISOString()}, aciklama = ${note}`;
  try {
    const result = await db.execute(sql`
      with saved as (
        update ${table} set tutar = ${amount}, yontem = ${method}::odeme_yontemi, ${details}
        where id = ${id} returning id
      ) insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${user.uid}, 'guncelle', ${kind === "payment" ? "tahsilat" : "gider"}, id from saved returning id
    `);
    if (!result.rows.length) return "Kayıt bulunamadı.";
  } catch { return "Değişiklik kaydedilemedi."; }
  redirect("/finans");
}

export async function deleteFinance(kind: "payment" | "expense", id: number, _: string | null, form: FormData) {
  const user = await requireUser("yonetici");
  if (!form.has("confirm")) return "Silme onayını işaretleyin.";
  const table = kind === "payment" ? schema.payments : schema.expenses;
  try {
    await getDb().execute(sql`
      with removed as (delete from ${table} where id = ${id} returning id, to_jsonb(${table}) as details)
      insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id, detay)
      select ${user.uid}, 'sil', ${kind === "payment" ? "tahsilat" : "gider"}, id, details from removed
    `);
  } catch { return "Kayıt silinemedi."; }
  redirect("/finans");
}
