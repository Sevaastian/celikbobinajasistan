import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { ReportLinks } from "@/components/report-links";
import { DeleteRecord } from "@/components/delete-record";
import { formatWindingWires } from "@/lib/wire-sizes";
import { WorkshopHistory } from "@/components/workshop-history";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { recordId } from "@/lib/record-input";
import { RecordPhotos } from "@/components/record-photos";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { motorFields, windingFields } from "../fields";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { windingRecords: w, customers: c, workOrders: o, technicalFields } = schema;
  const [row] = await db.select({ record: w, customer: c.name, order: o.number }).from(w)
    .leftJoin(c, eq(w.customerId, c.id)).leftJoin(o, eq(w.workOrderId, o.id)).where(eq(w.id, id));
  if (!row) notFound();
  const { record, customer, order } = row;
  const serial = record.serialNo?.trim();
  const [related, definitions] = await Promise.all([
    serial ? db.select({ id: w.id, brand: w.brand, model: w.model, date: w.createdAt }).from(w)
      .where(and(ne(w.id, id), sql`lower(trim(${w.serialNo})) = lower(${serial})`))
      .orderBy(desc(w.createdAt), desc(w.id)) : [],
    db.select({ key: technicalFields.key, label: technicalFields.label }).from(technicalFields)
      .where(eq(technicalFields.isSystem, false)).orderBy(asc(technicalFields.sortOrder)),
  ]);
  const labels = new Map(definitions.map(({ key, label }) => [key, label]));
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">Bobinaj #{id}</h1><p className="text-zinc-400">{formatDate(record.createdAt)}</p></div>
      <div className="flex flex-wrap gap-2">
        <ReportLinks kind="bobinaj" id={id} />
        <Link href={`/bobinaj/${id}/duzenle`} className={btnGhost}>Düzenle</Link>
        <Link href={`/bobinaj/yeni?kopya=${id}`} className={btnPrimary}>Kopyadan yeni kayıt</Link>
      </div>
    </header>
    {(customer || order || record.copiedFromId) && <section className={cardCls + " flex flex-wrap gap-4"}>
      {customer && <Link className="text-accent-400" href={`/musteriler/${record.customerId}`}>{customer}</Link>}
      {order && <Link className="text-accent-400" href={`/is-emirleri/${record.workOrderId}`}>{order}</Link>}
      {record.copiedFromId && <Link className="text-accent-400" href={`/bobinaj/${record.copiedFromId}`}>Kaynak #{record.copiedFromId}</Link>}
    </section>}
    <section className={cardCls}>
      <h2 className="mb-2 font-semibold">Kullanılacak teller</h2>
      <p>{formatWindingWires(record) || "Tel seçilmedi"}</p>
    </section>
    {([["Motor bilgileri", motorFields], ["Sargı bilgileri", windingFields]] as const).map(([title, fields]) => <section className={cardCls} key={title}>
      <h2 className="mb-3 font-semibold">{title}</h2>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map(([key, label]) => <div key={key}><dt className="text-sm text-zinc-400">{label}</dt>
          <dd className="whitespace-pre-wrap break-words">{record[key] ?? "—"}</dd></div>)}
      </dl>
    </section>)}
    {Object.keys(record.extra).length > 0 && <section className={cardCls}>
      <h2 className="mb-3 font-semibold">Ek teknik alanlar</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {Object.entries(record.extra).map(([key, value]) => <div key={key}>
          <dt className="text-sm text-zinc-400">{labels.get(key) ?? key}</dt><dd className="break-words">{value ?? "—"}</dd>
        </div>)}
      </dl>
    </section>}
    {related.length > 0 && <section className={cardCls}>
      <h2 className="mb-3 font-semibold">Aynı seri numarasına sahip kayıtlar</h2>
      {related.map(item => <Link className="block py-1 text-accent-400" href={`/bobinaj/${item.id}`} key={item.id}>
        {[`#${item.id}`, item.brand, item.model, formatDate(item.date)].filter(Boolean).join(" · ")}
      </Link>)}
    </section>}
    <WorkshopHistory kind="bobinaj" id={id} createdBy={record.createdBy} createdAt={record.createdAt} />
    <RecordPhotos target="winding" id={id} />
    {user.role === "yonetici" && <DeleteRecord kind="bobinaj" id={id} />}
  </div>;
}
