import { and, desc, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { DEVICE_LABELS, STATUS_LABELS, formatDate } from "@/lib/format";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { Field, SelectField } from "@/components/record-fields";

export default async function Page({ searchParams }: { searchParams: { q?: string; durum?: string } }) {
  await requireUser();
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 300) : "";
  const status = schema.workStatusEnum.enumValues.find(value => value === searchParams.durum);
  const { workOrders: w, customers: c } = schema;
  const pattern = `%${query}%`;
  const orders = await getDb().select({ order: w, customer: c.name }).from(w)
    .innerJoin(c, eq(w.customerId, c.id))
    .where(and(status ? eq(w.status, status) : undefined, query ? or(
      ilike(w.number, pattern), ilike(c.name, pattern), ilike(c.phone, pattern),
      ilike(w.brand, pattern), ilike(w.model, pattern), ilike(w.serialNo, pattern),
    ) : undefined)).orderBy(desc(w.receivedAt), desc(w.id));
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">İş Emirleri</h1>
      <Link href="/is-emirleri/kabul" className={btnPrimary}>Hızlı kabul</Link>
    </header>
    <form className="grid items-end gap-3 sm:grid-cols-[2fr_1fr_auto]">
      <Field label="İş emri, müşteri veya cihaz ara" name="q" value={query} />
      <SelectField label="Durum" name="durum" value={status} options={Object.entries(STATUS_LABELS)} empty="Tüm durumlar" />
      <button className={btnGhost}>Filtrele</button>
    </form>
    <div className={cardCls + " divide-y divide-ink-600"}>
      {orders.length === 0 && <p className="text-zinc-400">İş emri bulunamadı.</p>}
      {orders.map(({ order, customer }) => <Link key={order.id} href={`/is-emirleri/${order.id}`}
        className="flex flex-wrap justify-between gap-2 py-3 hover:text-accent-400">
        <div><p className="font-semibold">{order.number} · {customer}</p>
        <p className="text-sm text-zinc-400">{[DEVICE_LABELS[order.deviceType], order.brand, order.model, order.serialNo].filter(Boolean).join(" · ")}</p></div>
        <div className="text-sm"><p>{STATUS_LABELS[order.status]}</p><p className="text-zinc-400">{formatDate(order.receivedAt)}</p></div>
      </Link>)}
    </div>
  </div>;
}
