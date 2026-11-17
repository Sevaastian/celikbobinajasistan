import { and, gte, inArray, sql } from "drizzle-orm";
import { Award, Lock } from "lucide-react";
import { getDb, schema } from "@/db";
import { BadgeWatcher } from "./badge-watcher";

function monthStartIstanbul() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 3 * 3600 * 1000);
}

/** Ekibin görebildiği kilometre taşları: sayılar veritabanından hesaplanır. */
export async function Achievements() {
  const db = getDb();
  const { workOrders, windingRecords, customers } = schema;
  const monthStart = monthStartIstanbul();
  const [[orders], [delivered], [windings], [monthWindings], [clients]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders),
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders).where(inArray(workOrders.status, ["tamamlandi", "teslim_edildi"])),
    db.select({ n: sql<number>`count(*)::int` }).from(windingRecords),
    db.select({ n: sql<number>`count(*)::int` }).from(windingRecords).where(and(gte(windingRecords.createdAt, monthStart))),
    db.select({ n: sql<number>`count(*)::int` }).from(customers),
  ]);
  const badges = [
    { title: "İlk iş", note: "İlk iş emri", have: orders.n, need: 1 },
    { title: "İlk 100 iş", note: "100 iş emri", have: orders.n, need: 100 },
    { title: "500 iş", note: "500 iş emri", have: orders.n, need: 500 },
    { title: "100 teslim", note: "Tamamlanan/teslim edilen 100 iş", have: delivered.n, need: 100 },
    { title: "Bu ay 10 bobinaj", note: "Bu ay 10 bobinaj kaydı", have: monthWindings.n, need: 10 },
    { title: "Bu ay 50 bobinaj", note: "Bu ay 50 bobinaj kaydı", have: monthWindings.n, need: 50 },
    { title: "Defter 250", note: "Toplam 250 bobinaj kaydı", have: windings.n, need: 250 },
    { title: "Kalabalık müşteri", note: "100 müşteri", have: clients.n, need: 100 },
  ];
  const earned = badges.filter(b => b.have >= b.need);
  const next = badges.filter(b => b.have < b.need).sort((a, b) => (b.have / b.need) - (a.have / a.need))[0];
  return <section className="rounded-xl border border-ink-600 bg-ink-800 p-4" aria-label="Rozetler">
    <BadgeWatcher earned={earned.map(b => b.title)} />
    <h2 className="mb-3 mt-2 font-semibold">Atölye rozetleri <span className="text-xs font-normal text-zinc-400">({earned.length}/{badges.length})</span></h2>
    <ul className="flex flex-wrap gap-2">
      {badges.map(b => b.have >= b.need
        ? <li key={b.title} title={b.note} className="flex items-center gap-1.5 rounded-full bg-accent-500/15 px-3 py-1 text-sm text-accent-400"><Award size={14} /> {b.title}</li>
        : <li key={b.title} title={`${b.note} — ${b.have}/${b.need}`} className="flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1 text-sm text-zinc-500"><Lock size={13} /> {b.title}</li>)}
    </ul>
    {next && <p className="mt-3 text-xs text-zinc-400">Sıradaki rozet: <b className="text-zinc-200">{next.title}</b> — {next.have}/{next.need}</p>}
  </section>;
}
