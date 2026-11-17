"use server";

import { getExtraFields, readExtra } from "@/lib/technical-extra";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { isWindingDevice } from "@/lib/format";
import { decimal, field, recordId } from "@/lib/record-input";
import { windingWires, wireSizes } from "@/lib/wire-sizes";
import { motorFields, windingFields } from "./fields";

export async function saveWinding(id: number | null, sourceId: number | null, _previous: string | null, form: FormData) {
  const user = await requireUser();
  const db = getDb();
  const { windingRecords, workOrders, activityLogs } = schema;
  const workOrderId = recordId(field(form, "workOrderId"));
  const selectedCustomer = recordId(field(form, "customerId"));
  if (field(form, "workOrderId") && !workOrderId) return "Geçerli bir iş emri seçin.";
  if (field(form, "customerId") && !selectedCustomer) return "Geçerli bir müşteri seçin.";
  const values: Partial<typeof windingRecords.$inferInsert> = {};
  for (const [key, label, kind] of [...motorFields, ...windingFields]) {
    const raw = field(form, key);
    if (kind === "integer") {
      const value = recordId(raw);
      if (raw && value === null) return `${label} için pozitif bir tam sayı girin.`;
      values[key] = value;
    } else if (kind === "power") {
      const value = decimal(raw, 7, 3);
      if (raw && value === null) return `${label} için geçerli bir sayı girin.`;
      values[key] = value;
    } else {
      values[key] = raw.slice(0, kind === "multiline" ? 5000 : 300) || null;
    }
  }

  const coilWeights: string[] = [];
  for (let index = 0; index < 100; index++) {
    const raw = field(form, `coilGram-${index}`);
    if (!raw) continue;
    const grams = decimal(raw, 6, 1);
    if (!grams) return `${index + 1}. bobin gramı için geçerli bir sayı girin (örn. 125,5).`;
    coilWeights.push(grams);
  }

  let savedId = id;
  try {
    const relatedId = id ?? sourceId;
    const [[order], [previous], fields] = await Promise.all([
      workOrderId ? db.select().from(workOrders).where(eq(workOrders.id, workOrderId)) : [],
      relatedId ? db.select().from(windingRecords).where(eq(windingRecords.id, relatedId)) : [],
      getExtraFields("motor"),
    ]);
    if (relatedId && !previous) return "Bobinaj kaydı bulunamadı.";
    if (workOrderId && !isWindingDevice(order?.deviceType)) return "Motor, dalgıç, fan, alternatör gibi sarım işi olan bir iş emri seçin.";
    if (order && selectedCustomer && selectedCustomer !== order.customerId) return "Müşteri, iş emrindeki müşteriyle eşleşmelidir.";

    const oldSizes = windingWires(previous);
    const sizes: string[] = [];
    for (let index = 0; index < 10; index++) {
      const raw = field(form, `wire-${index}`);
      if (!raw) continue;
      const size = decimal(raw, 3, 3);
      if (!size || (!wireSizes.some(option => Number(option) === Number(size)) && !oldSizes.some(old => old && Number(old) === Number(size)))) {
        return "Listeden geçerli bir tel çapı seçin.";
      }
      sizes.push(size);
    }
    const auxSizes: string[] = [];
    for (let index = 0; index < 10; index++) {
      const raw = field(form, `aux-wire-${index}`);
      if (!raw) continue;
      const size = decimal(raw, 3, 3);
      const oldAux = previous?.auxWireDiameters ?? [];
      if (!size || (!wireSizes.some(option => Number(option) === Number(size)) && !oldAux.some(old => old && Number(old) === Number(size)))) {
        return "Yardımcı bobin için listeden geçerli bir tel çapı seçin.";
      }
      auxSizes.push(size);
    }
    const auxSipir = field(form, "auxSipir").slice(0, 300) || null;
    const auxHatve = field(form, "auxHatve").slice(0, 300) || null;
    const [wireDiameter = null, secondWireDiameter = null, ...additionalWireDiameters] = sizes;
    const parsed = readExtra(form, fields, previous?.extra);
    if (parsed.error) return parsed.error;
    const extra = parsed.extra ?? {};
    const data = { ...values, wireDiameter, secondWireDiameter, additionalWireDiameters, auxSipir, auxHatve, auxWireDiameters: auxSizes, coilWeights, customerId: order?.customerId ?? selectedCustomer, workOrderId, extra, updatedAt: new Date() };
    if (id === null) {
      const result = await db.execute<{ id: number }>(sql`select nextval(pg_get_serial_sequence('bobinaj_kayitlari', 'id'))::int as id`);
      savedId = result.rows[0].id;
      await db.batch([
        db.insert(windingRecords).values({ ...data, id: savedId, copiedFromId: sourceId, createdBy: user.uid }),
        db.insert(activityLogs).values({ entity: "bobinaj", entityId: savedId, action: "olustur", userId: user.uid }),
      ]);
    } else {
      await db.batch([
        db.update(windingRecords).set(data).where(eq(windingRecords.id, id)),
        db.insert(activityLogs).values({ entity: "bobinaj", entityId: id, action: "guncelle", userId: user.uid,
          details: values.notes !== previous?.notes && values.notes ? { note: values.notes, author: user.name } : { author: user.name },
        }),
      ]);
    }
  } catch (error) {
    console.error("Bobinaj kaydı başarısız", error);
    return "Bobinaj kaydedilemedi. Müşteri ve iş emri seçimini kontrol edip tekrar deneyin.";
  }
  if (workOrderId && field(form, "teardown") === "1") redirect(`/is-emirleri/${workOrderId}/sokum?kayit=${savedId}&kaydedildi=1`);
  redirect(`/bobinaj/${savedId}?kaydedildi=1`);
}
