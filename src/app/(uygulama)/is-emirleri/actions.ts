"use server";

import { getExtraFields, readExtra } from "@/lib/technical-extra";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isWindingDevice } from "@/lib/format";
import { decimal, field, parseLocalDateTime, recordId } from "@/lib/record-input";

const { workOrders, workOrderStatusHistory, activityLogs, customers, users } = schema;

export async function saveOrder(id: number | null, _previous: string | null, form: FormData) {
  const user = await requireUser();
  const customerId = recordId(field(form, "customerId"));
  const assignedUserId = recordId(field(form, "assignedUserId"));
  const deviceType = schema.deviceTypeEnum.enumValues.find(value => value === field(form, "deviceType"));
  const quick = id === null && field(form, "quickIntake") === "1";
  if (quick && !field(form, "complaint")) return "Arıza şikâyetini girin.";
  const receivedAt = quick ? new Date() : parseLocalDateTime(field(form, "receivedAt"));
  const rawQuantity = field(form, "quantity") || "1";
  const quantity = /^\d{1,4}$/.test(rawQuantity) ? Number(rawQuantity) : 0;
  if (quantity < 1 || quantity > 9999) return "Adet 1 ile 9999 arasında bir tam sayı olmalı.";
  const estimated = field(form, "estimatedPrice");
  const final = field(form, "finalPrice");
  const estimatedPrice = decimal(estimated, 10, 2);
  const finalPrice = decimal(final, 10, 2);
  if (!customerId || !deviceType || !receivedAt) return "Müşteri, cihaz türü ve geçerli bir geliş tarihi seçin.";
  if ((estimated && !estimatedPrice) || (final && !finalPrice)) return "Ücretleri en fazla iki ondalık basamakla girin.";
  if (field(form, "assignedUserId") && !assignedUserId) return "Geçerli bir personel seçin.";

  const values = {
    customerId, assignedUserId, deviceType, receivedAt, estimatedPrice, finalPrice, quantity,
    brand: field(form, "brand").slice(0, 300) || null,
    model: field(form, "model").slice(0, 300) || null,
    serialNo: field(form, "serialNo").slice(0, 300) || null,
    complaint: field(form, "complaint").slice(0, 5000) || null,
    diagnosis: field(form, "diagnosis").slice(0, 5000) || null,
    plannedWork: field(form, "plannedWork").slice(0, 5000) || null,
    updatedAt: new Date(),
  };

  const db = getDb();
  let savedId = id;
  try {
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.id, customerId));
    if (!customer) return "Seçilen müşteri bulunamadı.";
    if (assignedUserId) {
      const [assignee] = await db.select({ active: users.active }).from(users).where(eq(users.id, assignedUserId));
      if (!assignee?.active) {
        const [existing] = id ? await db.select({ assigned: workOrders.assignedUserId }).from(workOrders).where(eq(workOrders.id, id)) : [];
        if (existing?.assigned !== assignedUserId) return "Atanacak personel aktif olmalıdır.";
      }
    }
    const [previous] = id ? await db.select({ extra: workOrders.extra }).from(workOrders).where(eq(workOrders.id, id)) : [];
    const parsed = readExtra(form, await getExtraFields("diger"), previous?.extra);
    if (parsed.error) return parsed.error;
    const extra = parsed.extra ?? {};
    if (id === null) {
      const result = await db.execute<{ id: number }>(sql`select nextval(pg_get_serial_sequence('is_emirleri', 'id'))::int as id`);
      const nextId = result.rows[0].id;
      const year = new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Europe/Istanbul" }).format(values.updatedAt);
      await db.batch([
        db.insert(workOrders).values({ ...values, id: nextId, extra, number: `CB-${year}-${String(nextId).padStart(5, "0")}`, createdBy: user.uid }),
        db.insert(workOrderStatusHistory).values({ workOrderId: nextId, toStatus: "yeni_geldi", userId: user.uid }),
        db.insert(activityLogs).values({ userId: user.uid, action: "olustur", entity: "is_emri", entityId: nextId }),
      ]);
      savedId = nextId;
    } else {
      const result = await db.execute<{ id: number }>(sql`
        with updated as (
          update is_emirleri set
            musteri_id = ${customerId}, cihaz_turu = ${deviceType}::cihaz_turu,
            atanan_kullanici_id = ${assignedUserId}, gelis_tarihi = ${receivedAt.toISOString()},
            tahmini_ucret = ${estimatedPrice}, kesin_ucret = ${finalPrice},
            adet = ${quantity}, marka = ${values.brand}, model = ${values.model}, seri_no = ${values.serialNo},
            ariza_sikayeti = ${values.complaint}, ariza_tespiti = ${values.diagnosis},
            yapilacak_islemler = ${values.plannedWork}, ek_alanlar = ${JSON.stringify(extra)}::jsonb, guncelleme_tarihi = now()
          where id = ${id}
            and (musteri_id = ${customerId} or (
              not exists (select 1 from tahsilatlar where is_emri_id = ${id})
              and not exists (select 1 from bobinaj_kayitlari where is_emri_id = ${id})
              and not exists (select 1 from jenerator_servis_kayitlari where is_emri_id = ${id})
            ))
            and (cihaz_turu = ${deviceType}::cihaz_turu or
              (${isWindingDevice(deviceType)} and cihaz_turu::text in ('motor','dalgic','su_motoru','fan_motoru','alternator')
                and not exists (select 1 from el_aleti_tamirleri where is_emri_id = ${id}) and not exists (select 1 from pompa_tamirleri where is_emri_id = ${id}) and not exists (select 1 from jenerator_servis_kayitlari where is_emri_id = ${id})) or
              (not exists (select 1 from bobinaj_kayitlari where is_emri_id = ${id})
              and not exists (select 1 from el_aleti_tamirleri where is_emri_id = ${id})
              and not exists (select 1 from pompa_tamirleri where is_emri_id = ${id})
              and not exists (select 1 from jenerator_servis_kayitlari where is_emri_id = ${id})))
          returning id
        )
        insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
        select ${user.uid}, 'guncelle', 'is_emri', id from updated
        returning varlik_id as id
      `);
      if (!result.rows.length) return "İş emri bulunamadı veya bağlı kayıtlar nedeniyle müşteri ya da cihaz türü değiştirilemiyor.";
    }
  } catch (error) {
    console.error("İş emri kaydedilemedi", error);
    return "İş emri kaydedilemedi. Lütfen tekrar deneyin.";
  }
  redirect(`/is-emirleri/${savedId}?kaydedildi=1`);
}

export async function changeOrderStatus(id: number, expected: string, _previous: string | null, form: FormData) {
  const user = await requireUser();
  const status = schema.workStatusEnum.enumValues.find(value => value === field(form, "status"));
  const date = field(form, "deliveredAt");
  const deliveredAt = date ? parseLocalDateTime(date) : null;
  if (!status || (date && !deliveredAt)) return "Geçerli bir durum ve teslim tarihi seçin.";
  if (status === expected) return "Farklı bir durum seçin.";

  try {
    const result = await getDb().execute(sql`
      with updated as (
        update is_emirleri set
          durum = ${status}::is_durumu,
          teslim_tarihi = case when ${status} = 'teslim_edildi'
            then coalesce(${deliveredAt?.toISOString() ?? null}::timestamptz, now()) else null end,
          guncelleme_tarihi = now()
        where id = ${id} and durum = ${expected}::is_durumu
        returning id
      ), history as (
        insert into is_emri_durum_gecmisi (is_emri_id, onceki_durum, yeni_durum, kullanici_id, "not")
        select id, ${expected}::is_durumu, ${status}::is_durumu, ${user.uid}, ${field(form, "note").slice(0, 5000) || null} from updated
      )
      insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${user.uid}, 'durum_degisti', 'is_emri', id from updated
      returning id
    `);
    if (!result.rows.length) return "İş emrinin durumu değişmiş. Sayfayı yenileyip tekrar deneyin.";
  } catch (error) {
    console.error("İş emri durumu güncellenemedi", error);
    return "Durum kaydedilemedi. Lütfen tekrar deneyin.";
  }
  const celebrate = status === "tamamlandi" || status === "teslim_edildi";
  redirect(`/is-emirleri/${id}?kaydedildi=1${celebrate ? "&kutlama=1" : ""}`);
}

