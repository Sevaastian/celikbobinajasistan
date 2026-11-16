import "server-only";
import { sql, type SQL } from "drizzle-orm";

/**
 * Kaba kuvvet koruması. Başarısız girişler iki anahtarla sayılır:
 *  - kullanıcı adı + IP: 5 hatada 15 dakika kilit (gerçek kullanıcı, saldırganın IP'sinden etkilenmez)
 *  - yalnızca IP: 30 hatada 15 dakika kilit (çok sayıda kullanıcı adı deneyen saldırgan)
 * Başarılı girişte kullanıcı+IP sayacı sıfırlanır.
 */

export const USER_LIMIT = 5;
export const IP_LIMIT = 30;
export const WINDOW_MINUTES = 15;

export type Executor = { execute: (query: SQL) => Promise<{ rows: Record<string, unknown>[] }> };

export function loginKeys(username: string, ip: string) {
  return {
    user: `k:${username.trim().toLowerCase().slice(0, 100)}|${ip}`,
    ip: `i:${ip}`,
  };
}

/** Kilitliyse kalan dakikayı, değilse null döndürür. */
export async function lockedMinutes(db: Executor, keys: string[]): Promise<number | null> {
  const list = sql.join(keys.map((k) => sql`${k}`), sql`, `);
  const result = await db.execute(sql`
    select ceil(extract(epoch from (max(kilit_bitis) - now())) / 60)::int as dakika
    from giris_denemeleri
    where anahtar in (${list}) and kilit_bitis > now()
  `);
  const minutes = result.rows[0]?.dakika;
  return typeof minutes === "number" ? minutes : null;
}

/** Başarısız denemeyi sayar; bu deneme kilide yol açtıysa kalan dakikayı döndürür. */
export async function recordFailure(db: Executor, key: string, limit: number): Promise<number | null> {
  const result = await db.execute(sql`
    insert into giris_denemeleri (anahtar, deneme, pencere_basi, kilit_bitis)
    values (${key}, 1, now(), null)
    on conflict (anahtar) do update set
      deneme = case when giris_denemeleri.pencere_basi < now() - make_interval(mins => ${WINDOW_MINUTES})
                    then 1 else giris_denemeleri.deneme + 1 end,
      pencere_basi = case when giris_denemeleri.pencere_basi < now() - make_interval(mins => ${WINDOW_MINUTES})
                          then now() else giris_denemeleri.pencere_basi end,
      kilit_bitis = case when (case when giris_denemeleri.pencere_basi < now() - make_interval(mins => ${WINDOW_MINUTES})
                                    then 1 else giris_denemeleri.deneme + 1 end) >= ${limit}
                         then now() + make_interval(mins => ${WINDOW_MINUTES}) else null end
    returning ceil(extract(epoch from (kilit_bitis - now())) / 60)::int as dakika
  `);
  await db.execute(sql`delete from giris_denemeleri where pencere_basi < now() - interval '1 day'`);
  const minutes = result.rows[0]?.dakika;
  return typeof minutes === "number" ? minutes : null;
}

export async function clearAttempts(db: Executor, key: string) {
  await db.execute(sql`delete from giris_denemeleri where anahtar = ${key}`);
}
