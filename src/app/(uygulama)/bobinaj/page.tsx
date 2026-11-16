import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { missingWinding } from "@/lib/winding-check";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { formatWindingWires, wireOptions, wireValue } from "@/lib/wire-sizes";
import { decimal } from "@/lib/record-input";
import { BulkDelete } from "@/components/bulk-delete";
import { Field, SelectField } from "@/components/record-fields";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const session = await requireUser();
  const text = (key: string) => typeof searchParams[key] === "string" ? (searchParams[key] as string).trim().slice(0, 300) : "";
  const q = text("q");
  const sipir = text("sipir");
  const hatve = text("hatve");
  const mold = text("kalip");
  const wire = text("tel");
  const diameter = decimal(wire, 3, 3);
  const { windingRecords: w, customers: c, workOrders: o } = schema;
  const pattern = `%${q}%`;
  const rows = wire && !diameter ? [] : await getDb().select({ record: w, customer: c.name }).from(w)
    .leftJoin(c, eq(w.customerId, c.id)).leftJoin(o, eq(w.workOrderId, o.id))
    .where(and(
      q ? or(ilike(w.brand, pattern), ilike(w.model, pattern), ilike(w.serialNo, pattern), ilike(w.mold, pattern),
        ilike(c.name, pattern), ilike(c.phone, pattern), ilike(o.number, pattern)) : undefined,
      sipir ? ilike(w.sipir, `%${sipir}%`) : undefined,
      hatve ? ilike(w.hatve, `%${hatve}%`) : undefined,
      mold ? ilike(w.mold, `%${mold}%`) : undefined,
      diameter ? or(eq(w.wireDiameter, diameter), eq(w.secondWireDiameter, diameter), sql`${diameter}::numeric = any(${w.additionalWireDiameters})`) : undefined,
    )).orderBy(desc(w.createdAt), desc(w.id));
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Motor Bobinaj</h1>
      <div className="flex flex-wrap gap-2">
        {session.role !== "personel" && <Link href="/bobinaj/ice-aktar" className={btnGhost}>Eski kayıtları aktar</Link>}
        <Link href="/bobinaj/yeni" className={btnPrimary}>Yeni bobinaj kaydı</Link>
      </div>
    </header>
    <form className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Motor, seri numarası, müşteri veya iş emri" name="q" value={q} />
      <Field label="Sipir" name="sipir" value={sipir} />
      <Field label="Hatve" name="hatve" value={hatve} />
      <Field label="Kalıp" name="kalip" value={mold} />
      <SelectField label="Tel çapı" name="tel" empty="Tüm çaplar" value={wireValue(diameter)} options={wireOptions(diameter)} />
      <button className={btnGhost}>Filtrele</button>
    </form>
    {wire && !diameter && <p role="alert" className="text-red-300">Tel çapını 0,80 gibi sayısal bir değer olarak girin.</p>}
    {session.role === "yonetici" ? <BulkDelete kind="bobinaj">
    <div className={cardCls + " divide-y divide-ink-600"}>
      {rows.length === 0 && <p className="text-zinc-400">Bobinaj kaydı bulunamadı.</p>}
      {rows.map(({ record, customer }) => <div key={record.id} className="flex items-start gap-3">
        {session.role === "yonetici" && <input type="checkbox" name="ids" value={record.id} aria-label={`#${record.id} seç`} className="mt-4 h-5 w-5 shrink-0" />}
        <Link href={`/bobinaj/${record.id}`} className="block min-w-0 flex-1 py-3 hover:text-accent-400">
        <p className="font-semibold">{missingWinding(record).length > 0 && <span title={`Eksik: ${missingWinding(record).join(", ")}`} className="mr-1 text-red-400">❗</span>}{[`#${record.id}`, record.brand, record.model, record.serialNo, customer].filter(Boolean).join(" · ")}</p>
        <p className="text-sm text-zinc-400">{formatDate(record.createdAt)} · Sipir {record.sipir ?? "—"} · Hatve {record.hatve ?? "—"}{record.mold && ` · Kalıp ${record.mold}`}{record.wireDiameter && ` · Tel ${formatWindingWires(record)}`}</p>
      </Link></div>)}
    </div>
    </BulkDelete> :
    <div className={cardCls + " divide-y divide-ink-600"}>
      {rows.length === 0 && <p className="text-zinc-400">Bobinaj kaydı bulunamadı.</p>}
      {rows.map(({ record, customer }) => <div key={record.id} className="flex items-start gap-3">
        {session.role === "yonetici" && <input type="checkbox" name="ids" value={record.id} aria-label={`#${record.id} seç`} className="mt-4 h-5 w-5 shrink-0" />}
        <Link href={`/bobinaj/${record.id}`} className="block min-w-0 flex-1 py-3 hover:text-accent-400">
        <p className="font-semibold">{[`#${record.id}`, record.brand, record.model, record.serialNo, customer].filter(Boolean).join(" · ")}</p>
        <p className="text-sm text-zinc-400">{formatDate(record.createdAt)} · Sipir {record.sipir ?? "—"} · Hatve {record.hatve ?? "—"}{record.wireDiameter && ` · Tel ${formatWindingWires(record)}`}</p>
      </Link></div>)}
    </div>
    }
  </div>;
}
