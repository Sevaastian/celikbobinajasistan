"use server";

import { getExtraFields, readExtra } from "@/lib/technical-extra";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { decimal, field, recordId } from "@/lib/record-input";
import { serviceFields, servicePaths, type ServiceKind } from "@/lib/service-fields";

export async function newOperation(_: string | null, form: FormData) {
  const user = await requireUser("usta");
  const name = field(form, "name").slice(0, 100);
  if (!name) return "İşlem adını girin.";
  try {
    await getDb().execute(sql`
      with saved as (
        insert into hazir_islemler (ad, cihaz_turu)
        select ${name}, 'el_aleti'
        where not exists (select 1 from hazir_islemler where lower(ad) = lower(${name}) and cihaz_turu = 'el_aleti')
        returning id
      ) insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id)
      select ${user.uid}, 'olustur', 'hazir_islem', id from saved
    `);
  } catch { return "İşlem eklenemedi."; }
  redirect("/el-aletleri");
}

export async function saveService(kind: ServiceKind, id: number | null, parentId: number | null, _: string | null, form: FormData) {
  const user = await requireUser();
  const db = getDb();
  const { workOrders, generators, generatorServiceLogs, toolRepairs, pumpRepairs, activityLogs } = schema;
  const data: Record<string, string | number | null> = {};
  for (const [key, label, type] of serviceFields[kind]) {
    const value = field(form, key);
    if (type === "integer") {
      const parsed = recordId(value);
      if (value && !parsed) return `${label} için pozitif tam sayı girin.`;
      data[key] = parsed;
    } else if (type === "money" || type === "power" || type === "hours") {
      const parsed = decimal(value, type === "money" ? 10 : type === "power" ? 8 : 9, type === "hours" ? 1 : 2);
      if (value && !parsed) return `${label} için geçerli bir sayı girin.`;
      data[key] = parsed ?? (type === "money" ? "0" : null);
    } else if (type === "date") {
      const date = new Date(value + "T00:00:00Z");
      if (!/^\d{4}-\d\d-\d\d$/.test(value) || value.startsWith("0000") || !Number.isFinite(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== value) return "Geçerli servis tarihi girin.";
      data[key] = value;
    } else data[key] = value.slice(0, type === "long" ? 5000 : 300) || null;
  }
  let destination: string = kind === "service" ? servicePaths.jenerator : servicePaths[kind];
  try {
    const workOrderId = recordId(field(form, "workOrderId"));
    const customerId = recordId(field(form, "customerId"));
    if (kind !== "service") {
      const table = kind === "jenerator" ? generators : kind === "el_aleti" ? toolRepairs : pumpRepairs;
      const [previous] = id ? await db.select({ extra: table.extra }).from(table).where(eq(table.id, id)) : [];
      if (id && !previous) return "Servis kaydı bulunamadı.";
      const parsed = readExtra(form, await getExtraFields(kind), previous?.extra);
      if (parsed.error) return parsed.error;
      Object.assign(data, { extra: parsed.extra });
    }
    if (kind === "jenerator") {
      const [prior] = id ? await db.select().from(generators).where(eq(generators.id, id)) : [];
      if (prior && prior.customerId !== customerId) {
        const [linked] = await db.select({ id: generatorServiceLogs.id }).from(generatorServiceLogs)
          .where(and(eq(generatorServiceLogs.generatorId, prior.id), sql`${generatorServiceLogs.workOrderId} is not null`)).limit(1);
        if (linked) return "İş emrine bağlı servis kaydı olan jeneratörün müşterisi değiştirilemez.";
      }
      const values = { ...data, customerId };
      const [row] = id ? await db.update(generators).set(values).where(eq(generators.id, id)).returning({ id: generators.id })
        : await db.insert(generators).values(values).returning({ id: generators.id });
      if (!row) return "Jeneratör bulunamadı.";
      await db.insert(activityLogs).values({ userId: user.uid, entity: kind, entityId: row.id, action: id ? "guncelle" : "olustur" });
      destination += `/${row.id}`;
    } else if (kind === "service") {
      if (!parentId) return "Jeneratör bulunamadı.";
      const [generator] = await db.select().from(generators).where(eq(generators.id, parentId));
      if (!generator) return "Jeneratör bulunamadı.";
      const serviceKind = field(form, "kind");
      if (!["bakim", "ariza"].includes(serviceKind)) return "Servis türü seçin.";
      if (workOrderId) {
        const [order] = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), eq(workOrders.deviceType, "jenerator")));
        if (!order || (generator.customerId && order.customerId !== generator.customerId)) return "Jeneratöre uygun iş emri seçin.";
      }
      const values = { ...data, generatorId: parentId, workOrderId, kind: serviceKind, serviceDate: String(data.serviceDate) };
      const save = id ? db.update(generatorServiceLogs).set(values)
        .where(and(eq(generatorServiceLogs.id, id), eq(generatorServiceLogs.generatorId, parentId))) : db.insert(generatorServiceLogs).values(values);
      await db.batch([save, db.execute(sql`
        with latest as (
          select tarih, calisma_saati from jenerator_servis_kayitlari
          where jenerator_id = ${parentId} and tur = 'bakim' order by tarih desc, id desc limit 1
        )
        update jeneratorler set son_bakim_tarihi = (select tarih from latest),
          son_bakim_saati = (select calisma_saati from latest)
        where id = ${parentId}
      `), db.insert(activityLogs).values({ userId: user.uid, entity: "jenerator_servisi", entityId: id ?? undefined, action: id ? "guncelle" : "olustur" })]);
      destination += `/${parentId}`;
    } else {
      if (!workOrderId) return "İş emri seçin.";
      const [order] = await db.select().from(workOrders).where(and(eq(workOrders.id, workOrderId), eq(workOrders.deviceType, kind)));
      if (!order) return "Cihaz türüne uygun iş emri seçin.";
      if (kind === "el_aleti") {
        const selected = form.getAll("operations").filter((value): value is string => typeof value === "string");
        const operations = [...new Set([...selected, ...field(form, "additionalOperations").split("\n")].map(v => v.trim().slice(0, 150)).filter(Boolean))].slice(0, 50);
        const total = (Math.round(Number(data.labor) * 100) + Math.round(Number(data.materialCost) * 100)) / 100;
        if (total >= 1e10) return "Toplam ücret izin verilen tutarı aşıyor.";
        const values = { ...data, workOrderId, operations, total: total.toFixed(2) };
        const [row] = id ? await db.update(toolRepairs).set(values).where(eq(toolRepairs.id, id)).returning({ id: toolRepairs.id })
          : await db.insert(toolRepairs).values(values).returning({ id: toolRepairs.id });
        if (!row) return "Tamir kaydı bulunamadı.";
        await db.insert(activityLogs).values({ userId: user.uid, entity: kind, entityId: row.id, action: id ? "guncelle" : "olustur" });
      } else {
        const values = { ...data, workOrderId };
        const [row] = id ? await db.update(pumpRepairs).set(values).where(eq(pumpRepairs.id, id)).returning({ id: pumpRepairs.id })
          : await db.insert(pumpRepairs).values(values).returning({ id: pumpRepairs.id });
        if (!row) return "Tamir kaydı bulunamadı.";
        await db.insert(activityLogs).values({ userId: user.uid, entity: kind, entityId: row.id, action: id ? "guncelle" : "olustur" });
      }
      destination = `/is-emirleri/${workOrderId}`;
    }
  } catch (error) {
    console.error("Servis kaydı yazılamadı", error);
    return "Servis kaydı yazılamadı.";
  }
  redirect(destination);
}
