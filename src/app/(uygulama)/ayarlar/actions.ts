"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { field } from "@/lib/record-input";

export async function saveTechnicalField(id: number | null, _previous: string | null, form: FormData) {
  const user = await requireUser("yonetici");
  const label = field(form, "label");
  const kind = schema.fieldTypeEnum.enumValues.find(value => value === field(form, "fieldType"));
  const deviceTypes = schema.deviceTypeEnum.enumValues.filter(value => form.getAll("deviceTypes").includes(value));
  const options = [...new Set(field(form, "options").split("\n").map(value => value.trim()).filter(Boolean))];
  if (!label || label.length > 100 || !kind || !deviceTypes.length) return "Alan adı, türü ve en az bir cihaz türü seçin.";
  if (kind === "secim" && (!options.length || options.length > 50 || options.some(item => item.length > 100))) {
    return "Seçim alanına en fazla 50 seçenek girin. Her seçenek 100 karakteri geçmemelidir.";
  }
  const data = { label, fieldType: kind, deviceTypes, options: kind === "secim" ? options : null, active: form.has("active") };
  const db = getDb();
  const { technicalFields, activityLogs } = schema;
  try {
    const values = { ...data, key: randomUUID() };
    if (id) {
      const [existing] = await db.select({ id: technicalFields.id }).from(technicalFields)
        .where(and(eq(technicalFields.id, id), eq(technicalFields.isSystem, false), eq(technicalFields.fieldType, kind)));
      if (!existing) return "Özel alan bulunamadı veya alan türü değiştirilemez.";
      await db.batch([
        db.update(technicalFields).set(data).where(and(eq(technicalFields.id, id), eq(technicalFields.isSystem, false))),
        db.insert(activityLogs).values({ userId: user.uid, action: "guncelle", entity: "teknik_alan", entityId: id }),
      ]);
    } else {
      await db.insert(technicalFields).values(values);
    }
  } catch (error) {
    console.error("Teknik alan kaydedilemedi", error);
    return "Teknik alan kaydedilemedi. Lütfen tekrar deneyin.";
  }
  redirect("/ayarlar");
}
