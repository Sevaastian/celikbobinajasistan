import Link from "next/link";
import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatDate } from "@/lib/format";
import { formatWindingWires } from "@/lib/wire-sizes";
import { btnGhost, cardCls, inputCls } from "./ui";

/**
 * "Hazır kayıttan doldur": daha önce girilmiş herhangi bir bobinaj kaydını seçip
 * yeni kayda aktarır. Kaynak kayıt değişmez; aynı kayıttan istenen kadar kopya alınabilir.
 */
export async function ReadyRecordPicker({ base, params = {}, search }: {
  base: string; params?: Record<string, string>; search: string;
}) {
  const { windingRecords: w, customers: c } = schema;
  const q = search.trim().slice(0, 100);
  const pattern = `%${q}%`;
  const rows = await getDb().select({ record: w, customer: c.name }).from(w).leftJoin(c, eq(w.customerId, c.id))
    .where(q ? or(ilike(w.brand, pattern), ilike(w.model, pattern), ilike(w.serialNo, pattern), ilike(c.name, pattern), ilike(w.sipir, pattern), ilike(w.hatve, pattern)) : undefined)
    .orderBy(desc(w.createdAt), desc(w.id)).limit(q ? 20 : 8);
  const link = (extra: Record<string, string>) => `${base}?${new URLSearchParams({ ...params, ...extra }).toString()}`;
  return <details className={cardCls} open={!!q}>
    <summary className="cursor-pointer font-semibold">Hazır kayıttan doldur</summary>
    <p className="mt-1 text-xs text-zinc-400">Daha önce girilmiş bir motoru seçin; bilgileri bu kayda aktarılır. Aynı kayıttan istediğiniz kadar, istediğiniz müşteriye ekleyebilirsiniz.</p>
    <form action={base} className="mt-3 flex gap-2">
      {Object.entries(params).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input name="ara" defaultValue={q} placeholder="Marka, model, seri no, müşteri, sipir..." className={inputCls} />
      <button className={btnGhost}>Ara</button>
    </form>
    <div className="mt-2 divide-y divide-ink-600">
      {rows.length === 0 && <p className="py-3 text-sm text-zinc-400">Kayıt bulunamadı.</p>}
      {rows.map(({ record: r, customer }) => <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
        <div className="min-w-0">
          <p className="font-medium">{[r.brand, r.model].filter(Boolean).join(" ") || "Motor"} <span className="text-xs text-zinc-400">#{r.id} · {customer ?? "müşterisiz"} · {formatDate(r.createdAt)}</span></p>
          <p className="text-sm text-zinc-400">Sipir {r.sipir ?? "—"} · Hatve {r.hatve ?? "—"}{formatWindingWires(r) && ` · ${formatWindingWires(r)}`}</p>
        </div>
        <Link className={btnGhost} href={link({ kopya: String(r.id) })}>Bunu kullan</Link>
      </div>)}
    </div>
  </details>;
}
