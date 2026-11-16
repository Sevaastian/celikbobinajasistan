"use server";

import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { removeStoredPhotos } from "@/lib/photo-storage";

const config = {
  bobinaj: { table: schema.windingRecords, path: "/bobinaj" },
  el_aleti: { table: schema.toolRepairs, path: "/el-aletleri" },
  pompa: { table: schema.pumpRepairs, path: "/pompalar" },
  jenerator: { table: schema.generators, path: "/jeneratorler" },
  is_emri: { table: schema.workOrders, path: "/is-emirleri" },
  fotograf: { table: schema.photos, path: "/" },
};

export async function deleteRecord(kind: keyof typeof config, id: number, _: string | null, form: FormData) {
  const user = await requireUser("yonetici");
  if (!form.has("confirm")) return "Silme onayını işaretleyin.";
  const { table, path } = config[kind];
  const guard = kind === "is_emri" ? sql`
    and not exists (select 1 from bobinaj_kayitlari where is_emri_id = ${id})
    and not exists (select 1 from el_aleti_tamirleri where is_emri_id = ${id})
    and not exists (select 1 from pompa_tamirleri where is_emri_id = ${id})
    and not exists (select 1 from jenerator_servis_kayitlari where is_emri_id = ${id})
    and not exists (select 1 from tahsilatlar where is_emri_id = ${id})
    and not exists (select 1 from is_emri_malzemeleri where is_emri_id = ${id})
    and not exists (select 1 from fotograflar where is_emri_id = ${id})`
    : kind === "jenerator" ? sql`and not exists (select 1 from jenerator_servis_kayitlari where jenerator_id = ${id})`
    : kind === "bobinaj" ? sql`and not exists (select 1 from bobinaj_kayitlari where kopya_kaynak_id = ${id})` : sql``;
  try {
    // Silinecek kayda bağlı Blob fotoğraflarının adreslerini önceden al
    let blobUrls: string[] = [];
    if (kind === "fotograf" || kind === "bobinaj") {
      const found = await getDb().execute<{ url: string }>(kind === "fotograf"
        ? sql`select url from fotograflar where id = ${id}`
        : sql`select url from fotograflar where bobinaj_id = ${id}`);
      blobUrls = found.rows.map((r) => r.url);
    }
    const result = await getDb().execute(sql`
      with removed as (delete from ${table} where id = ${id} ${guard} returning *)
      insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id, detay)
      select ${user.uid}, 'sil', ${kind}, id, to_jsonb(removed) - 'url' from removed returning id, detay
    `);
    const row = result.rows[0];
    if (!row) return "Kayıt bulunamadı veya bağlı kayıtları nedeniyle silinemiyor.";
    await removeStoredPhotos(blobUrls);
    if (kind === "fotograf") {
      const info = row.detay as { is_emri_id?: number; bobinaj_id?: number };
      if (info.is_emri_id) return redirect(`/is-emirleri/${info.is_emri_id}`);
      if (info.bobinaj_id) return redirect(`/bobinaj/${info.bobinaj_id}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    console.error("Kayıt silinemedi", error);
    return "Kayıt silinemedi.";
  }
  redirect(path);
}
