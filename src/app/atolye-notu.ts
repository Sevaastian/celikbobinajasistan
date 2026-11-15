"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { field } from "@/lib/record-input";

export async function addWorkshopNote(kind: "is_emri" | "bobinaj", id: number, _: string | null, form: FormData) {
  const user = await requireUser();
  const note = field(form, "note");
  if (!note || note.length > 5000) return "Not 1–5000 karakter arasında olmalıdır.";
  const db = getDb();
  const table = kind === "is_emri" ? schema.workOrders : schema.windingRecords;
  try {
    const [parent] = await db.select({ id: table.id }).from(table).where(eq(table.id, id));
    if (!parent) return "Kayıt bulunamadı.";
    await db.insert(schema.activityLogs).values({
      userId: user.uid, entity: kind, entityId: id, action: "atolye_notu",
      details: { note, author: user.name },
    });
  } catch {
    return "Not kaydedilemedi. Tekrar deneyin.";
  }
  revalidatePath(`/${kind === "is_emri" ? "is-emirleri" : "bobinaj"}/${id}`);
  if (kind === "is_emri") revalidatePath(`/is-emirleri/${id}/sokum`);
  else {
    const [winding] = await db.select({ orderId: schema.windingRecords.workOrderId }).from(schema.windingRecords)
      .where(eq(schema.windingRecords.id, id));
    if (winding?.orderId) revalidatePath(`/is-emirleri/${winding.orderId}/sokum`);
  }
  return null;
}
