import { requireUser } from "@/lib/auth";
import { Achievements } from "@/components/achievements";
import { DailySurprise } from "@/components/daily-surprise";
import { CashChart } from "@/components/cash-chart";
import Link from "next/link";
import { and, desc, eq, gt, gte, lt, lte, sql, inArray } from "drizzle-orm";
import { Plus, UserPlus, ClipboardPlus, Cog, PackagePlus, Banknote } from "lucide-react";
import { getDb, schema } from "@/db";
import { formatTL, formatDate, STATUS_LABELS } from "@/lib/format";

const { workOrders, customers, payments, expenses, stockItems } = schema;

function startOfDayIstanbul(offsetDays = 0) {
  // Europe/Istanbul sabit UTC+3 (yaz saati uygulaması yok)
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays);
  return new Date(d - 3 * 3600 * 1000);
}
function startOfMonthIstanbul() {
  const now = new Date(Date.now() + 3 * 3600 * 1000);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 3 * 3600 * 1000);
}

export default async function Dashboard() {
  const user = await requireUser();
  const db = getDb();
  const today = startOfDayIstanbul();
  const tomorrow = startOfDayIstanbul(1);
  const monthStart = startOfMonthIstanbul();

  const [
    [todayIn],
    [inProgress],
    [done],
    [ready],
    [todayPay],
    [monthRevenue],
    [monthExpense],
    critical,
    lastCustomers,
    lastOrders,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders)
      .where(and(gte(workOrders.receivedAt, today), lt(workOrders.receivedAt, tomorrow))),
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders)
      .where(inArray(workOrders.status, ["incelemede", "ariza_tespit_edildi", "musteri_onayi_bekliyor", "islemde", "parca_bekliyor", "test_asamasinda"])),
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders)
      .where(and(eq(workOrders.status, "tamamlandi"), gte(workOrders.updatedAt, monthStart))),
    db.select({ n: sql<number>`count(*)::int` }).from(workOrders).where(eq(workOrders.status, "teslime_hazir")),
    db.select({ t: sql<string>`coalesce(sum(${payments.amount}),0)` }).from(payments)
      .where(and(gte(payments.paidAt, today), lt(payments.paidAt, tomorrow))),
    // Aylık ciro = bu ay gerçekten tahsil edilen tutar
    db.select({ t: sql<string>`coalesce(sum(${payments.amount}),0)` }).from(payments)
      .where(gte(payments.paidAt, monthStart)),
    db.select({ t: sql<string>`coalesce(sum(${expenses.amount}),0)` }).from(expenses)
      .where(gte(expenses.spentAt, monthStart)),
    db.select().from(stockItems)
      .where(and(eq(stockItems.active, true), gt(stockItems.minQuantity, "0"), lte(stockItems.quantity, stockItems.minQuantity)))
      .limit(6),
    db.select().from(customers).orderBy(desc(customers.createdAt)).limit(5),
    db.select({
      id: workOrders.id, number: workOrders.number, status: workOrders.status,
      brand: workOrders.brand, model: workOrders.model, receivedAt: workOrders.receivedAt,
      customer: customers.name,
    }).from(workOrders).innerJoin(customers, eq(customers.id, workOrders.customerId))
      .orderBy(desc(workOrders.receivedAt)).limit(6),
  ]);

  const profit = Number(monthRevenue.t) - Number(monthExpense.t);

  const stats = [
    { label: "Bugün gelen cihaz", value: String(todayIn.n) },
    { label: "İşlemdeki iş", value: String(inProgress.n) },
    { label: "Tamamlanan (bu ay)", value: String(done.n) },
    { label: "Teslime hazır", value: String(ready.n) },
    { label: "Bugünkü tahsilat", value: formatTL(todayPay.t) },
    { label: "Aylık ciro (tahsilat)", value: formatTL(monthRevenue.t) },
    { label: "Aylık gider", value: formatTL(monthExpense.t) },
    { label: "Tahmini kâr", value: formatTL(profit) },
  ];

  const quick = [
    { href: "/musteriler/yeni", label: "Yeni müşteri", icon: UserPlus },
    { href: "/is-emirleri/kabul", label: "Hızlı kabul", icon: ClipboardPlus },
    { href: "/bobinaj/yeni", label: "Yeni bobinaj kaydı", icon: Cog },
    ...(user.role !== "personel" ? [
      { href: "/stok/giris", label: "Stok girişi", icon: PackagePlus },
      { href: "/finans/tahsilat", label: "Tahsilat ekle", icon: Banknote },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <header className="cb-heading"><h1 className="text-2xl font-bold">Genel Bakış</h1></header>

      <DailySurprise />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {quick.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="cb-action flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800 px-3 py-3 text-sm font-medium transition hover:border-accent-500">
            <Icon size={18} className="text-accent-500" /> {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-600 bg-ink-800 p-4">
            <div className="text-xs text-zinc-400">{s.label}</div>
            <div className="mt-1 text-xl font-bold text-accent-400">{s.value}</div>
          </div>
        ))}
      </div>

      <Achievements />
      <CashChart paid={Number(monthRevenue.t)} spent={Number(monthExpense.t)} />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-ink-600 bg-ink-800 p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Son iş emirleri</h2>
          {lastOrders.length === 0 ? (
            <p className="text-sm text-zinc-400">Henüz iş emri yok.</p>
          ) : (
            <ul className="divide-y divide-ink-600">
              {lastOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/is-emirleri/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-accent-400">
                    <span className="min-w-0">
                      <span className="font-medium">{o.number}</span>
                      <span className="block truncate text-xs text-zinc-400">
                        {o.customer} · {[o.brand, o.model].filter(Boolean).join(" ") || "—"} · {formatDate(o.receivedAt)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-accent-500/15 px-2 py-0.5 text-xs text-accent-400">
                      {STATUS_LABELS[o.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border border-ink-600 bg-ink-800 p-4">
            <h2 className="mb-3 font-semibold">Kritik stoklar</h2>
            {critical.length === 0 ? (
              <p className="text-sm text-zinc-400">Kritik seviyede ürün yok.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {critical.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0 text-red-400">{Number(s.quantity)} / {Number(s.minQuantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-ink-600 bg-ink-800 p-4">
            <h2 className="mb-3 font-semibold">Son müşteriler</h2>
            {lastCustomers.length === 0 ? (
              <p className="text-sm text-zinc-400">Henüz müşteri yok.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lastCustomers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/musteriler/${c.id}`} className="hover:text-accent-400">{c.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
