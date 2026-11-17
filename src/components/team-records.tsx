import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { Flame, Trophy, CalendarCheck, UserRound } from "lucide-react";
import { getDb, schema } from "@/db";

const tr = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric", timeZone: "Europe/Istanbul" });
const dayKey = (d: Date) => new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
const monthName = (key: string) => new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${key}-15T12:00:00Z`));

/** Eğlenceli ekip istatistikleri: rekor gün, aylık rekor, en uzun seri, ayın bobinajcısı. */
export async function TeamRecords() {
  const db = getDb();
  const { workOrders, windingRecords, users } = schema;
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  const monthKey = now.toISOString().slice(0, 7);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 3 * 3600 * 1000);
  const [days, months, [top]] = await Promise.all([
    db.select({ d: sql<string>`to_char(${workOrders.receivedAt} at time zone 'Europe/Istanbul', 'YYYY-MM-DD')`, n: sql<number>`count(*)::int` })
      .from(workOrders).groupBy(sql`1`).orderBy(sql`1`),
    db.select({ m: sql<string>`to_char(${workOrders.updatedAt} at time zone 'Europe/Istanbul', 'YYYY-MM')`, n: sql<number>`count(*)::int` })
      .from(workOrders).where(inArray(workOrders.status, ["tamamlandi", "teslim_edildi"])).groupBy(sql`1`),
    db.select({ name: users.fullName, n: sql<number>`count(*)::int` }).from(windingRecords)
      .innerJoin(users, eq(users.id, windingRecords.createdBy))
      .where(and(gte(windingRecords.createdAt, monthStart))).groupBy(users.id, users.fullName).orderBy(desc(sql`count(*)`)).limit(1),
  ]);
  if (days.length === 0) return null;

  const busiest = days.reduce((best, d) => (d.n > best.n ? d : best), days[0]);
  const set = new Set(days.map(d => d.d));
  // Seri: art arda iş emri açılan gün sayısı (Pazar günleri seriyi bozmaz).
  const sorted = days.map(d => d.d);
  let longest = 0, run = 0, prev: string | null = null;
  const nextDay = (key: string) => { const t = new Date(`${key}T12:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); if (t.getUTCDay() === 0) t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };
  for (const key of sorted) { run = prev && nextDay(prev) === key ? run + 1 : 1; longest = Math.max(longest, run); prev = key; }
  let current = 0; let cursor = dayKey(new Date());
  if (!set.has(cursor)) { const y = new Date(Date.now() - 86400000); cursor = dayKey(y); }
  while (set.has(cursor)) { current++; const t = new Date(`${cursor}T12:00:00Z`); do { t.setUTCDate(t.getUTCDate() - 1); } while (t.getUTCDay() === 0); cursor = t.toISOString().slice(0, 10); }
  const bestMonth = months.reduce((best, m) => (m.n > best.n ? m : best), { m: monthKey, n: 0 });
  const thisMonth = months.find(m => m.m === monthKey)?.n ?? 0;

  const tiles = [
    { icon: Trophy, label: "Rekor gün", value: `${busiest.n} iş emri`, note: tr.format(new Date(`${busiest.d}T12:00:00Z`)) },
    { icon: CalendarCheck, label: "Bu ay tamamlanan", value: `${thisMonth} iş`, note: bestMonth.n > 0 ? `Rekor ay: ${bestMonth.n} (${monthName(bestMonth.m)})` : "İlk rekoru sen koy!" },
    { icon: Flame, label: "En uzun seri", value: `${longest} gün`, note: current > 0 ? `Şu an seri: ${current} gün 🔥` : "Bugün iş açarak seriyi başlat" },
    { icon: UserRound, label: "Ayın bobinajcısı", value: top?.name ?? "—", note: top ? `${top.n} bobinaj kaydı bu ay` : "Bu ay henüz bobinaj kaydı yok" },
  ];
  return <section className="rounded-xl border border-ink-600 bg-ink-800 p-4" aria-label="Ekip rekorları">
    <h2 className="mb-3 font-semibold">Ekip rekorları</h2>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map(({ icon: Icon, label, value, note }) => <div key={label} className="rounded-lg bg-ink-900 p-3">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Icon size={14} className="text-accent-400" /> {label}</div>
        <div className="mt-1 truncate text-lg font-bold text-accent-400">{value}</div>
        <div className="text-xs text-zinc-400">{note}</div>
      </div>)}
    </div>
  </section>;
}
