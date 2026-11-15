import { and, asc, desc, eq } from "drizzle-orm";
import { DeleteRecord } from "@/components/delete-record";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatTL } from "@/lib/format";
import { ServiceForm } from "@/components/service-form";
import { RecordForm } from "@/components/record-form";
import { Field } from "@/components/record-fields";
import { cardCls } from "@/components/ui";
import { newOperation } from "@/app/servis-actions";

export async function RepairPage({ kind, orderId }: { kind: "el_aleti" | "pompa"; orderId: number | null }) {
  const user = await requireUser();
  const db = getDb();
  const { workOrders: w, customers: c, repairOperations: r } = schema;
  const [orders, repairs, presets] = await Promise.all([
    db.select({ id: w.id, number: w.number, name: c.name }).from(w).innerJoin(c, eq(c.id, w.customerId))
      .where(eq(w.deviceType, kind)).orderBy(desc(w.id)),
    kind === "el_aleti" ? db.select().from(schema.toolRepairs).orderBy(desc(schema.toolRepairs.id))
      : db.select().from(schema.pumpRepairs).orderBy(desc(schema.pumpRepairs.id)),
    kind === "el_aleti" ? db.select({ name: r.name }).from(r)
      .where(and(eq(r.deviceType, kind), eq(r.active, true))).orderBy(asc(r.name)) : [],
  ]);
  const options = orders.map(o => [o.id, `${o.number} · ${o.name}`] as const);
  const operations = presets.map(r => r.name);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">{kind === "el_aleti" ? "El Aletleri" : "Pompa Servisi"}</h1>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Yeni tamir kaydı</h2>
      {options.length ? <ServiceForm kind={kind} orders={options} operations={operations} selectedOrder={orderId} />
        : <Link href={`/is-emirleri/yeni?cihaz=${kind}`} className="text-accent-400">Önce cihaz için bir iş emri açın</Link>}
    </section>
    {kind === "el_aleti" && user.role !== "personel" && <details className={cardCls}>
      <summary className="cursor-pointer">Hazır işlem ekle</summary>
      <RecordForm action={newOperation}><Field name="name" label="İşlem adı" required /></RecordForm>
    </details>}
    <section className={cardCls}><h2 className="mb-3 font-semibold">Tamir kayıtları</h2>
      {repairs.length === 0 && <p className="text-sm text-zinc-400">Tamir kaydı bulunamadı.</p>}
      {repairs.filter(row => !orderId || row.workOrderId === orderId).map(row => <details key={row.id} className="border-t border-ink-600 py-3">
        <summary className="cursor-pointer">{[orders.find(o => o.id === row.workOrderId)?.number, row.brand, row.model,
          formatTL("total" in row ? row.total : row.cost)].filter(Boolean).join(" · ")}</summary>
        <Link className="my-2 block text-accent-400" href={`/is-emirleri/${row.workOrderId}`}>İş emrini aç</Link>
        <ServiceForm kind={kind} value={row} orders={options} operations={operations} />
        {user.role === "yonetici" && <DeleteRecord kind={kind} id={row.id} />}
      </details>)}
    </section>
  </div>;
}
