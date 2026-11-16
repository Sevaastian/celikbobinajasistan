"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { field } from "@/lib/record-input";
import { PHOTO_MAX_BYTES, storePhoto } from "@/lib/photo-storage";

export async function addPhoto(target: "order" | "winding", id: number, _previous: string | null, form: FormData) {
  const user = await requireUser();
  const file = form.get("photo");
  const kind = schema.photoKindEnum.enumValues.find(value => value === field(form, "kind"));
  if (!kind || !file || typeof file === "string" || !file.size) return "Bir fotoğraf ve fotoğraf türü seçin.";
  if (file.size > PHOTO_MAX_BYTES) return "Fotoğraf en fazla 4 MB olabilir. Daha küçük bir fotoğraf seçin.";
  const bytes = Buffer.from(await file.arrayBuffer());
  let mime: string | undefined;
  if (bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) mime = "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mime = "image/png";
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") mime = "image/webp";
  if (!mime) return "JPEG, PNG veya WebP biçiminde bir fotoğraf seçin.";

  const path = target === "order" ? `/is-emirleri/${id}` : `/bobinaj/${id}`;
  let orderId = target === "order" ? id : null;
  try {
    const db = getDb();
    const table = target === "order" ? schema.workOrders : schema.windingRecords;
    const [parent] = await db.select({ id: table.id }).from(table).where(eq(table.id, id));
    if (!parent) return "Bağlı kayıt bulunamadı.";
    const { photos, activityLogs, windingRecords } = schema;
    if (target === "winding") {
      const [winding] = await db.select({ orderId: windingRecords.workOrderId }).from(windingRecords).where(eq(windingRecords.id, id));
      orderId = winding?.orderId ?? null;
    }
    const storedUrl = await storePhoto(bytes, mime);
    const result = await db.execute<{ id: number }>(sql`select nextval(pg_get_serial_sequence('fotograflar', 'id'))::int as id`);
    const photoId = result.rows[0].id;
    await db.batch([
      db.insert(photos).values({
        id: photoId, kind, caption: field(form, "caption").slice(0, 300) || null,
        url: storedUrl, uploadedBy: user.uid,
        workOrderId: target === "order" ? id : null, windingRecordId: target === "winding" ? id : null,
      }),
      db.insert(activityLogs).values({ userId: user.uid, action: "olustur", entity: "fotograf", entityId: photoId }),
    ]);
  } catch (error) {
    console.error("Fotoğraf kaydedilemedi", error);
    return "Fotoğraf kaydedilemedi. Lütfen tekrar deneyin.";
  }
  revalidatePath(path);
  if (orderId) revalidatePath(`/is-emirleri/${orderId}/sokum`);
  return null;
}
