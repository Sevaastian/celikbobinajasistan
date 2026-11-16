import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cog } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { formatDate } from "@/lib/format";
import { formatWindingWires } from "@/lib/wire-sizes";
import { RecordPhotos } from "@/components/record-photos";
import { WorkshopHistory } from "@/components/workshop-history";
import { btnGhost, cardCls } from "@/components/ui";
import { ReadyRecordPicker } from "@/components/ready-record-picker";
import { WindingEditor } from "../../../bobinaj/editor";

export default async function Page({ params, searchParams }: {
  params: { id: string }; searchParams: { kopya?: string; kayit?: string; ara?: string };
}) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { workOrders: o, windingRecords: w, customers: c } = schema;
  const [row] = await db.select({ order: o, customer: c.name }).from(o)
    .innerJoin(c, eq(c.id, o.customerId)).where(and(eq(o.id, id), eq(o.deviceType, "motor")));
  if (!row) notFound();
  const { order, customer } = row;
  const linked = await db.select().from(w).where(eq(w.workOrderId, id)).orderBy(desc(w.id));
  const currentId = recordId(searchParams.kayit);
  const current = currentId ? linked.find(item => item.id === currentId) : linked[0];
  if (currentId && !current) notFound();
  const serial = current?.serialNo || order.serialNo;
  const sameMotor = serial ? sql`lower(trim(${w.serialNo})) = lower(trim(${serial}))` : undefined;
  const previous = await db.select().from(w).where(and(
    or(sql`${w.workOrderId} is null`, ne(w.workOrderId, id)),
    or(eq(w.customerId, order.customerId), sameMotor),
  )).orderBy(desc(w.createdAt), desc(w.id)).limit(12);
  const copyId = recordId(searchParams.kopya);
  const [source] = !current && copyId ? await db.select().from(w).where(eq(w.id, copyId)) : [];
  return <div className="mx-auto max-w-4xl space-y-4">
    <header className="cb-heading flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Cog size={24} className="text-accent-400" /> Söküm</h1>
        <p className="mt-1 text-sm text-zinc-300">{order.number} · {customer}{order.serialNo && ` · ${order.serialNo}`}</p></div>
      <Link className={btnGhost} href={`/is-emirleri/${id}`}>İş emrine dön</Link>
    </header>
    {linked.length > 1 && <nav className="flex flex-wrap gap-2">{linked.map(item =>
      <Link key={item.id} aria-current={item.id === current?.id ? "page" : undefined} className={btnGhost}
        href={`/is-emirleri/${id}/sokum?kayit=${item.id}`}>Bobinaj #{item.id}</Link>)}</nav>}
    {previous.length > 0 && <details className={cardCls} open>
      <summary className="cursor-pointer font-semibold">Önceki bobinaj kayıtları</summary>
      <div className="mt-2 divide-y divide-ink-600">
        {previous.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div><Link className="font-medium text-accent-400" href={`/bobinaj/${item.id}`}>
            {[item.brand, item.model, item.serialNo, formatDate(item.createdAt)].filter(Boolean).join(" · ")}
          </Link><p className="text-sm text-zinc-400">Sipir {item.sipir ?? "—"} · Hatve {item.hatve ?? "—"}{formatWindingWires(item) && ` · ${formatWindingWires(item)}`}</p></div>
          {!current && <Link className={btnGhost} href={`/is-emirleri/${id}/sokum?kopya=${item.id}`}>Bilgileri aktar</Link>}
        </div>)}
      </div>
    </details>}
    <WindingEditor key={`${current?.id ?? ""}:${source?.id ?? ""}`} current={current} source={source} orderId={id} teardown
      picker={<ReadyRecordPicker base={`/is-emirleri/${id}/sokum`} search={searchParams.ara ?? ""} />} />
    <WorkshopHistory kind={current ? "bobinaj" : "is_emri"} id={current?.id ?? id}
      createdBy={current ? current.createdBy : order.createdBy} createdAt={current?.createdAt ?? order.createdAt} />
    {current && <WorkshopHistory kind="is_emri" id={id} createdBy={order.createdBy} createdAt={order.createdAt} />}
    <RecordPhotos target={current ? "winding" : "order"} id={current?.id ?? id} defaultKind="sokum" />
    {current && <RecordPhotos target="order" id={id} defaultKind="sokum" />}
  </div>;
}
