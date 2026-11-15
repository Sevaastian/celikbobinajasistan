import { formatWindingWires } from "@/lib/wire-sizes";
import { ReportLinks } from "@/components/report-links";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Pencil, Phone, MapPin, ClipboardPlus } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTL, STATUS_LABELS, DEVICE_LABELS } from "@/lib/format";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { DeleteCustomerButton } from "../delete-button";

const { customers, workOrders, payments, windingRecords } = schema;

export default async function CustomerDetail({ params }: { params: { id: string } }) {
  const session = await requireUser();
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();

  const db = getDb();
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) notFound();

  const [orders, pays, windings] = await Promise.all([
    db.select().from(workOrders).where(eq(workOrders.customerId, id)).orderBy(desc(workOrders.receivedAt)),
    db.select().from(payments).where(eq(payments.customerId, id)).orderBy(desc(payments.paidAt)),
    db.select().from(windingRecords).where(eq(windingRecords.customerId, id)).orderBy(desc(windingRecords.createdAt)),
  ]);

  // Borç = iptal edilmeyen işlerin tutarı (kesin ücret) − yapılan tahsilatlar
  const billed = orders
    .filter((o) => o.status !== "iptal_edildi")
    .reduce((sum, o) => sum + Number(o.finalPrice ?? 0), 0);
  const paid = pays.reduce((sum, p) => sum + Number(p.amount), 0);
  const debt = billed - paid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="mt-1 space-y-0.5 text-sm text-zinc-400">
            {customer.phone && <div className="flex items-center gap-1.5"><Phone size={14} /> {customer.phone}</div>}
            {customer.address && <div className="flex items-center gap-1.5"><MapPin size={14} /> {customer.address}</div>}
            <div>Kayıt tarihi: {formatDate(customer.createdAt)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/is-emirleri/yeni?musteri=${id}`} className={btnPrimary}><ClipboardPlus size={16} /> Yeni iş emri</Link>
          {session.role !== "personel" && <Link href={`/finans/tahsilat?musteri=${id}`} className={btnGhost}>Tahsilat ekle</Link>}
          <ReportLinks kind="musteri" id={id} />
          <Link href={`/musteriler/${id}/duzenle`} className={btnGhost}><Pencil size={16} /> Düzenle</Link>
        </div>
      </div>

      {customer.notes && <div className={cardCls}><div className="mb-1 text-xs text-zinc-400">Notlar</div><p className="whitespace-pre-wrap text-sm">{customer.notes}</p></div>}

      <div className="grid grid-cols-3 gap-3">
        <div className={cardCls}><div className="text-xs text-zinc-400">Kesin iş tutarı</div><div className="mt-1 font-bold">{formatTL(billed)}</div></div>
        <div className={cardCls}><div className="text-xs text-zinc-400">Tahsil edilen</div><div className="mt-1 font-bold text-green-400">{formatTL(paid)}</div></div>
        <div className={cardCls}><div className="text-xs text-zinc-400">{debt < 0 ? "Avans" : "Kalan borç"}</div><div className={`mt-1 font-bold ${debt > 0 ? "text-red-400" : ""}`}>{formatTL(Math.abs(debt))}</div></div>
      </div>

      <section className={cardCls}>
        <h2 className="mb-3 font-semibold">İş emirleri ({orders.length})</h2>
        {orders.length === 0 ? <p className="text-sm text-zinc-400">İş emri yok.</p> : (
          <ul className="divide-y divide-ink-600 text-sm">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/is-emirleri/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-accent-400">
                  <span className="min-w-0">
                    <span className="font-medium">{o.number}</span>
                    <span className="block truncate text-xs text-zinc-400">
                      {DEVICE_LABELS[o.deviceType]} · {[o.brand, o.model].filter(Boolean).join(" ") || "—"} · {formatDate(o.receivedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs text-accent-400">{STATUS_LABELS[o.status]}</span>
                    <span className="text-xs text-zinc-400">{formatTL(o.finalPrice ?? o.estimatedPrice)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 font-semibold">Bobinaj kayıtları ({windings.length})</h2>
        {windings.length === 0 ? <p className="text-sm text-zinc-400">Bobinaj kaydı yok.</p> : (
          <ul className="divide-y divide-ink-600 text-sm">
            {windings.map((w) => (
              <li key={w.id}>
                <Link href={`/bobinaj/${w.id}`} className="block py-2.5 hover:text-accent-400">
                  <span className="font-medium">{[w.brand, w.model].filter(Boolean).join(" ") || "Motor"}</span>
                  <span className="block text-xs text-zinc-400">
                    Sipir: {w.sipir || "—"} · Hatve: {w.hatve || "—"} · Tel: {formatWindingWires(w) || "—"} · {formatDate(w.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardCls}>
        <h2 className="mb-3 font-semibold">Ödemeler ({pays.length})</h2>
        {pays.length === 0 ? <p className="text-sm text-zinc-400">Ödeme yok.</p> : (
          <ul className="divide-y divide-ink-600 text-sm">
            {pays.map((p) => (
              <li key={p.id} className="flex justify-between py-2.5">
                <span>{formatDate(p.paidAt)} · {{ nakit: "Nakit", havale_eft: "Havale/EFT", kredi_karti: "Kredi kartı" }[p.method]}</span>
                <span className="font-medium text-green-400">{formatTL(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {session.role === "yonetici" && <DeleteCustomerButton id={id} />}
    </div>
  );
}
