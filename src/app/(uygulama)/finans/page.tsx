import { and, desc, eq, gte, lt } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { balances, financePeriod, periods } from "@/lib/finance";
import { formatDateTime, formatTL } from "@/lib/format";
import { methods } from "@/lib/module-labels";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { RecordForm } from "@/components/record-form";
import { Field, SelectField } from "@/components/record-fields";
import { localDateTime } from "@/lib/record-input";
import { deleteFinance, editFinance } from "./actions";

export default async function Page({ searchParams }: { searchParams: { donem?: string } }) {
  const user = await requireUser("usta");
  const { key, from, to } = financePeriod(searchParams.donem);
  const { payments: p, expenses: e, customers: c } = schema;
  const db = getDb();
  const [receipts, costs, debts] = await Promise.all([
    db.select({ item: p, name: c.name }).from(p).innerJoin(c, eq(c.id, p.customerId))
      .where(and(gte(p.paidAt, from), lt(p.paidAt, to))).orderBy(desc(p.paidAt)),
    db.select().from(e).where(and(gte(e.spentAt, from), lt(e.spentAt, to))).orderBy(desc(e.spentAt)),
    balances(),
  ]);
  const paid = receipts.reduce((sum, { item }) => sum + Number(item.amount), 0);
  const spent = costs.reduce((sum, item) => sum + Number(item.amount), 0);
  const ledger = [
    ...receipts.map(({ item, name }) => ({ ...item, date: item.paidAt, label: name, details: item.note, kind: "payment" as const })),
    ...costs.map(item => ({ ...item, date: item.spentAt, label: item.category, details: item.description, kind: "expense" as const })),
  ].sort((a, b) => b.date.valueOf() - a.date.valueOf());
  return <div className="space-y-4">
    <header className="flex flex-wrap justify-between gap-3"><h1 className="text-2xl font-bold">Finans</h1>
      <div className="flex flex-wrap gap-2"><Link href="/finans/tahsilat" className={btnPrimary}>Tahsilat ekle</Link>
        <Link href="/finans/gider" className={btnGhost}>Gider ekle</Link></div></header>
    <nav className="flex flex-wrap gap-2">{periods.map(([value, label]) =>
      <Link aria-current={value === key ? "page" : undefined} className={value === key ? btnPrimary : btnGhost}
        key={value} href={`/finans?donem=${value}`}>{label}</Link>)}</nav>
    <div className="grid gap-3 sm:grid-cols-3">
      {([["Tahsilat", paid], ["Gider", spent], ["Net nakit", paid - spent]] as const).map(([label, value]) =>
        <div key={label} className={cardCls}><p className="text-sm text-zinc-400">{label}</p><p className="text-xl font-bold">{formatTL(value)}</p></div>)}
    </div>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Müşteri bakiyeleri</h2>
      {debts.length === 0 && <p className="text-sm text-zinc-400">Bakiye kaydı yok.</p>}
      {debts.map(row => <Link href={`/musteriler/${row.id}`} className="flex flex-wrap justify-between gap-2 border-t border-ink-600 py-2 text-sm" key={row.id}>
        <span>{row.name}</span><span>{Number(row.balance) < 0 ? "Avans" : "Kalan"} · {formatTL(Math.abs(Number(row.balance)))}</span>
      </Link>)}
    </section>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Finans hareketleri</h2>
      {ledger.length === 0 && <p className="text-sm text-zinc-400">Bu dönemde kayıt yok.</p>}
      {ledger.map(item => <div key={`${item.kind}-${item.id}`} className="border-t border-ink-600 py-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{item.label}</strong>
          <span>{item.kind === "expense" ? "−" : "+"}{formatTL(item.amount)}</span></div>
        <p className="text-zinc-400">{formatDateTime(item.date)} · {methods.find(([key]) => key === item.method)?.[1]}</p>
        {item.details && <p className="whitespace-pre-wrap break-words">{item.details}</p>}
        {user.role === "yonetici" && <><details className="mt-2"><summary className="cursor-pointer text-accent-400">Kaydı düzenle</summary>
          <RecordForm action={editFinance.bind(null, item.kind, item.id)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field name="amount" label="Tutar (₺)" value={item.amount} inputMode="decimal" required />
              <SelectField name="method" label="Ödeme yöntemi" options={methods} value={item.method} />
              <Field name="date" label="Tarih (Türkiye saati)" type="datetime-local" value={localDateTime(item.date)} required />
              <Field name="note" label="Açıklama" value={item.details} multiline />
            </div>
          </RecordForm></details><details className="mt-2"><summary className="cursor-pointer text-red-300">Kaydı sil</summary>
          <RecordForm action={deleteFinance.bind(null, item.kind, item.id)} label="Sil">
            <label className="block"><input name="confirm" type="checkbox" required /> Silmeyi onaylıyorum</label>
          </RecordForm></details></>}
      </div>)}
    </section>
  </div>;
}
