import { desc, eq } from "drizzle-orm";
import { ReportLinks } from "@/components/report-links";
import { servicePaths } from "@/lib/service-fields";
import { OrderMaterials } from "./materials";
import { DeleteRecord } from "@/components/delete-record";
import { WorkshopHistory } from "@/components/workshop-history";
import { QrCode, Cog } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { DEVICE_LABELS, STATUS_LABELS, formatDateTime, formatTL } from "@/lib/format";
import { RecordForm } from "@/components/record-form";
import { Field, SelectField } from "@/components/record-fields";
import { OrderPhotos } from "@/components/record-photos";
import { btnGhost, cardCls } from "@/components/ui";
import { changeOrderStatus } from "../actions";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { customers, workOrders, users, workOrderStatusHistory: history, windingRecords } = schema;
  const [row] = await db.select({ order: workOrders, customer: customers.name, assignee: users.fullName })
    .from(workOrders).innerJoin(customers, eq(workOrders.customerId, customers.id))
    .leftJoin(users, eq(workOrders.assignedUserId, users.id)).where(eq(workOrders.id, id));
  if (!row) notFound();
  const { order, customer, assignee } = row;
  const [events, windings] = await Promise.all([
    db.select({ event: history, user: users.fullName }).from(history).leftJoin(users, eq(history.userId, users.id))
      .where(eq(history.workOrderId, id)).orderBy(desc(history.createdAt), desc(history.id)),
    db.select({ id: windingRecords.id, date: windingRecords.createdAt }).from(windingRecords)
      .where(eq(windingRecords.workOrderId, id)).orderBy(desc(windingRecords.id)),
  ]);
  const details = [
    ["Cihaz türü", DEVICE_LABELS[order.deviceType]], ["Marka", order.brand], ["Model", order.model],
    ["Seri numarası", order.serialNo], ["Geliş", formatDateTime(order.receivedAt)],
    ["Teslim", formatDateTime(order.deliveredAt)], ["Atanan personel", assignee],
    ["Tahmini ücret", order.estimatedPrice === null ? null : formatTL(order.estimatedPrice)],
    ["Kesin ücret", order.finalPrice === null ? null : formatTL(order.finalPrice)],
    ["Arıza şikâyeti", order.complaint], ["Arıza tespiti", order.diagnosis], ["Yapılacak işlemler", order.plannedWork],
  ];
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{order.number}</h1>
        <Link href={`/musteriler/${order.customerId}`} className="text-accent-400">{customer}</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/is-emirleri/${id}/etiket`} className={btnGhost}><QrCode size={17} /> QR etiket</Link>
        <ReportLinks kind="is-emri" id={id} />
        {user.role !== "personel" && order.status !== "iptal_edildi" && <Link className={btnGhost} href={`/finans/tahsilat?isEmri=${id}`}>Tahsilat</Link>}
        {order.deviceType !== "motor" && order.deviceType !== "diger" &&
          <Link className={btnGhost} href={`${servicePaths[order.deviceType]}?isEmri=${id}`}>Servis kayıtları</Link>}
        <Link href={`/is-emirleri/${id}/duzenle`} className={btnGhost}>Düzenle</Link>
        {order.deviceType === "motor" && <Link href={`/is-emirleri/${id}/sokum`} className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-black"><Cog size={17} /> Söküm ekranı</Link>}
      </div>
    </header>
    <dl className={cardCls + " grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {details.map(([label, value]) => <div key={label}><dt className="text-sm text-zinc-400">{label}</dt>
        <dd className="whitespace-pre-wrap break-words">{value || "—"}</dd></div>)}
    </dl>
    {windings.length > 0 && <section className={cardCls}>
      <h2 className="mb-2 font-semibold">Bobinaj kayıtları</h2>
      {windings.map(item => <Link className="block py-1 text-accent-400" key={item.id} href={`/bobinaj/${item.id}`}>#{item.id} · {formatDateTime(item.date)}</Link>)}
    </section>}
    <OrderMaterials orderId={id} open={order.status !== "iptal_edildi" && order.status !== "teslim_edildi"} />
    <WorkshopHistory kind="is_emri" id={id} createdBy={order.createdBy} createdAt={order.createdAt} />
    <OrderPhotos orderId={id} />
    <section className={cardCls}>
      <h2 className="mb-3 font-semibold">Durum · {STATUS_LABELS[order.status]}</h2>
      <RecordForm key={order.status} action={changeOrderStatus.bind(null, id, order.status)} label="Durumu güncelle">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Yeni durum" name="status" empty="Durum seçin" required
            options={Object.entries(STATUS_LABELS).filter(([status]) => status !== order.status)} />
          <Field label="Teslim tarihi (teslim edildiğinde, Türkiye saati)" name="deliveredAt" type="datetime-local" />
          <Field label="Durum notu" name="note" multiline />
        </div>
      </RecordForm>
      <ol className="mt-5 space-y-3">
        {events.map(({ event, user }) => <li key={event.id} className="border-t border-ink-600 pt-3 text-sm">
          <span>{event.fromStatus && `${STATUS_LABELS[event.fromStatus]} → `}{STATUS_LABELS[event.toStatus]}</span>
          <p className="text-zinc-400">{formatDateTime(event.createdAt)} · {user ?? "—"}</p>
          {event.note && <p className="whitespace-pre-wrap break-words">{event.note}</p>}
        </li>)}
      </ol>
    </section>
    {user.role === "yonetici" && <DeleteRecord kind="is_emri" id={id} />}
  </div>;
}
