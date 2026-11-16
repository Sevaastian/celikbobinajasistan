import { sql, type SQL } from "drizzle-orm";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { execute: (query: SQL) => PromiseLike<{ rows: any[] }> };

/** Seçilen kayıtları siler; korumalar SQL içinde uygulanır. Test edilebilsin diye veritabanı dışarıdan verilir. */
export async function deleteSelected(db: Db, kind: "is_emri" | "bobinaj", ids: number[], withWindings: boolean, uid: number | null) {
  const list = sql.join(ids.map(id => sql`${id}`), sql`, `);
  const user = { uid };
  const blockers = (alias: SQL) => sql`
            and not exists (select 1 from el_aleti_tamirleri where is_emri_id = ${alias})
            and not exists (select 1 from pompa_tamirleri where is_emri_id = ${alias})
            and not exists (select 1 from jenerator_servis_kayitlari where is_emri_id = ${alias})
            and not exists (select 1 from tahsilatlar where is_emri_id = ${alias})
            and not exists (select 1 from is_emri_malzemeleri where is_emri_id = ${alias})
            and not exists (select 1 from fotograflar where is_emri_id = ${alias})`;
  // Silinebilecek bobinaj kayıtlarının Blob fotoğraflarını önceden bul.
    const photoRows = await db.execute(kind === "bobinaj"
      ? sql`select bobinaj_id, url from fotograflar where bobinaj_id in (${list})`
      : sql`select f.bobinaj_id, f.url from fotograflar f join bobinaj_kayitlari b on b.id = f.bobinaj_id where b.is_emri_id in (${list})`);

    let deleted: number;
    const removedWindings: number[] = [];
    if (kind === "bobinaj") {
      const result = await db.execute(sql`
        with removed as (
          delete from bobinaj_kayitlari b where b.id in (${list})
            and not exists (select 1 from bobinaj_kayitlari c where c.kopya_kaynak_id = b.id and c.id not in (${list}))
          returning *
        ), log as (
          insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id, detay)
          select ${user.uid}, 'sil', 'bobinaj', id, to_jsonb(removed) - 'url' from removed
        )
        select id from removed`);
      deleted = result.rows.length;
      removedWindings.push(...result.rows.map(r => r.id));
    } else {
      const windingStep = withWindings ? sql`
        , wr as (
          delete from bobinaj_kayitlari w where w.is_emri_id in (select o2.id from is_emirleri o2 where o2.id in (${list}) ${blockers(sql`o2.id`)})
            and not exists (select 1 from bobinaj_kayitlari c where c.kopya_kaynak_id = w.id
              and c.id not in (select id from bobinaj_kayitlari where is_emri_id in (${list})))
          returning *
        ), wlog as (
          insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id, detay)
          select ${user.uid}, 'sil', 'bobinaj', id, to_jsonb(wr) - 'url' from wr
        )` : sql``;
      const remaining = withWindings
        ? sql`not exists (select 1 from bobinaj_kayitlari b where b.is_emri_id = o.id and b.id not in (select id from wr))`
        : sql`not exists (select 1 from bobinaj_kayitlari b where b.is_emri_id = o.id)`;
      const result = await db.execute(sql`
        with sel as (select 1)
        ${windingStep}
        , removed as (
          delete from is_emirleri o where o.id in (${list})
            and ${remaining}
            ${blockers(sql`o.id`)}
          returning *
        ), log as (
          insert into islem_gecmisi (kullanici_id, islem, varlik, varlik_id, detay)
          select ${user.uid}, 'sil', 'is_emri', id, to_jsonb(removed) from removed
        )
        select 'is_emri' as kind, id from removed
        ${withWindings ? sql`union all select 'bobinaj', id from wr` : sql``}`);
      deleted = result.rows.filter(r => r.kind === "is_emri").length;
      removedWindings.push(...result.rows.filter(r => r.kind === "bobinaj").map(r => r.id));
    }
  return { deleted, removedWindings, photoRows };
}
