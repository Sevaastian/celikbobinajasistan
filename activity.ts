import "server-only";
import { getDb, schema } from "@/db";

/** İşlem geçmişine kayıt düşer. Log hatası asıl işlemi bozmasın diye yutulur. */
export async function logActivity(
  userId: number | null,
  action: string,
  entity: string,
  entityId?: number | null,
  details?: Record<string, unknown>,
) {
  try {
    await getDb().insert(schema.activityLogs).values({
      userId,
      action,
      entity,
      entityId: entityId ?? null,
      details: details ?? null,
    });
  } catch (e) {
    console.error("İşlem geçmişi yazılamadı", e);
  }
}
