import { and, asc, desc, eq } from "drizzle-orm";
import { DeleteRecord } from "@/components/delete-record";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTL } from "@/lib/format";
import { recordId } from "@/lib/record-input";
import { maintenanceDue } from "@/lib/service-fields";
import { ServiceForm } from "@/components/service-form";
import { cardCls } from "@/components/ui";

export default async function Page({ params, searchParams }: { params: { id: string }; searchParams: { isEmri?: string } }) {
  const user = await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { generators: g, generatorServiceLogs: l, workOrders: w, customers: c } = schema;
  const [row] = await db.select().from(g).where(eq(g.id, id));
  if (!row) notFound();
  const [logs, orders, clients] = await Promise.all([
    db.select().from(l).where(eq(l.generatorId, id)).orderBy(desc(l.serviceDate), desc(l.id)),
    db.select().from(w).where(and(eq(w.deviceType, "jenerator"), row.customerId ? eq(w.customerId, row.customerId) : undefined)).orderBy(desc(w.id)),
    db.select().from(c).orderBy(asc(c.name)),
  ]);
  const orderOptions = orders.map(o => [o.id, o.number] as const);
  const due = maintenanceDue(row);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">{[row.brand, row.model, row.serialNo].filter(Boolean).join(" · ") || `Jeneratör #${row.id}`}</h1>
    <section className={cardCls}>
      <p>Son bakım {formatDate(row.lastMaintenanceAt)} · Sonraki bakım {formatDate(due.date)}{due.hours !== null && ` · ${due.hours} saat`}</p>
      <details className="mt-3"><summary className="cursor-pointer text-accent-400">Jeneratörü düzenle</summary>
        <ServiceForm kind="jenerator" value={row} clients={clients.map(c => [c.id, c.name])} /></details>
    </section>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Servis kaydı ekle</h2>
      <ServiceForm kind="service" parentId={id} orders={orderOptions} selectedOrder={recordId(searchParams.isEmri)} />
    </section>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Servis geçmişi</h2>
      {!logs.length && <p>Servis kaydı bulunamadı.</p>}
      {logs.map(log => <details className="border-t border-ink-600 py-3" key={log.id}>
        <summary className="cursor-pointer">{formatDate(log.serviceDate)} · {log.kind === "bakim" ? "Bakım" : "Arıza"} · {formatTL(log.cost)}</summary>
        {log.workOrderId && <Link className="block py-2 text-accent-400" href={`/is-emirleri/${log.workOrderId}`}>İş emrini aç</Link>}
        <ServiceForm kind="service" parentId={id} orders={orderOptions} value={log} />
      </details>)}
    </section>
    {user.role === "yonetici" && <DeleteRecord kind="jenerator" id={id} />}
  </div>;
}
