import { sql } from "drizzle-orm";
import { getDb } from "@/db";

export const periods = [["gun", "Bugün"], ["hafta", "Bu hafta"], ["ay", "Bu ay"]] as const;

export function financePeriod(value?: string) {
  const key = periods.find(([key]) => key === value)?.[0] ?? "ay";
  const now = new Date(Date.now() + 10800000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const offset = (now.getUTCDay() + 6) % 7;
  const make = (month: number, day: number) => new Date(Date.UTC(y, month, day) - 10800000);
  if (key === "gun") return { key, from: make(m, d), to: make(m, d + 1) };
  if (key === "hafta") return { key, from: make(m, d - offset), to: make(m, d - offset + 7) };
  return { key, from: make(m, 1), to: make(m + 1, 1) };
}

export async function balances() {
  const result = await getDb().execute<{ id: number; name: string; billed: string; paid: string; balance: string }>(sql`
    with bills as (
      select musteri_id, sum(kesin_ucret) as amount from is_emirleri
      where durum <> 'iptal_edildi' group by musteri_id
    ), receipts as (
      select musteri_id, sum(tutar) as amount from tahsilatlar group by musteri_id
    )
    select m.id, m.ad_firma as name, coalesce(b.amount, 0) as billed,
      coalesce(r.amount, 0) as paid, coalesce(b.amount, 0) - coalesce(r.amount, 0) as balance
    from musteriler m left join bills b on b.musteri_id = m.id
    left join receipts r on r.musteri_id = m.id
    where b.amount is not null or r.amount is not null order by m.ad_firma
  `);
  return result.rows;
}
