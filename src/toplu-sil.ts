"use server";

import { deleteSelected } from "@/lib/bulk-delete";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { requireUser } from "@/lib/auth";
import { removeStoredPhotos } from "@/lib/photo-storage";
import { recordId } from "@/lib/record-input";

export type BulkResult = { message: string; ok: boolean } | null;
const MAX = 200;

/**
 * Seçilen iş emirlerini veya bobinaj kayıtlarını toplu siler (yalnız yönetici).
 * Tek kayıt silmedeki korumalar aynen geçerlidir; silinemeyenler atlanır ve sayısı bildirilir:
 *  - İş emri: tahsilat, malzeme, fotoğraf veya servis kaydı varsa silinmez.
 *    "Bağlı bobinaj kayıtlarını da sil" işaretliyse iş emrine bağlı bobinaj kayıtları da silinir.
 *  - Bobinaj: seçilmeyen bir kaydın kaynağıysa silinmez.
 */
export async function bulkDelete(kind: "is_emri" | "bobinaj", _previous: BulkResult, form: FormData): Promise<BulkResult> {
  const user = await requireUser("yonetici");
  const ids = [...new Set(form.getAll("ids").map(v => recordId(typeof v === "string" ? v : undefined)).filter((v): v is number => v !== null))];
  if (ids.length === 0) return { ok: false, message: "Silmek için önce kayıtları seçin." };
  if (ids.length > MAX) return { ok: false, message: `Tek seferde en fazla ${MAX} kayıt silinebilir.` };
  if (!form.has("confirm")) return { ok: false, message: "Silme onayını işaretleyin." };
  const withWindings = form.has("bobinajlar");

  try {
    const { deleted, removedWindings, photoRows } = await deleteSelected(getDb(), kind, ids, withWindings, user.uid);
    const gone = new Set(removedWindings);
    await removeStoredPhotos(photoRows.rows.filter(r => gone.has(r.bobinaj_id)).map(r => r.url));
    revalidatePath("/is-emirleri");
    revalidatePath("/bobinaj");
    revalidatePath("/");
    const skipped = ids.length - deleted;
    const label = kind === "is_emri" ? "iş emri" : "bobinaj kaydı";
    if (deleted === 0) return { ok: false, message: kind === "is_emri"
      ? "Hiçbiri silinemedi. Tahsilat, malzeme, fotoğraf veya bobinaj kaydı olan iş emirleri silinmez (bobinaj için \"bağlı bobinaj kayıtlarını da sil\" kutusunu işaretleyin)."
      : "Hiçbiri silinemedi. Başka kayıtların kaynağı olan bobinaj kayıtları silinmez." };
    return { ok: true, message: `${deleted} ${label} silindi${skipped ? `, ${skipped} tanesi bağlı kayıtları nedeniyle silinemedi` : ""}.` };
  } catch (error) {
    console.error("Toplu silme başarısız", error);
    return { ok: false, message: "Toplu silme başarısız oldu. Hiçbir kayıt silinmedi; tekrar deneyin." };
  }
}
