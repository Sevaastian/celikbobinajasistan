import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cog, Phone } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { DEVICE_LABELS, STATUS_LABELS, formatDate } from "@/lib/format";
import { isMonophase, missingWinding } from "@/lib/winding-check";
import { formatWireList, formatWindingWires } from "@/lib/wire-sizes";
import { formatGrams, formatKilos, sumGrams } from "@/lib/coil-weights";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";

/** Etiketteki QR'ın açtığı sayfa: motoru saracak kişinin tek bakışta görmesi gereken bilgiler. */
export default async function Page({ params }: { params: { id: string } }) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { workOrders: o, windingRecords: w, customers: c } = schema;
  const [row] = await db.select({ order: o, customer: c.name, phone: c.phone }).from(o)
    .innerJoin(c, eq(c.id, o.customerId)).where(eq(o.id, id));
  if (!row) notFound();
  const { order, customer, phone } = row;
  const windings = await db.select().from(w).where(eq(w.workOrderId, id)).orderBy(desc(w.id));
  const tel = phone?.replace(/[^\d+]/g, "");
  const line = (label: string, value: string | number | null | undefined) => value ? <div key={label}><dt className="text-xs text-zinc-400">{label}</dt><dd className="font-medium">{value}</dd></div> : null;
  return <div className="mx-auto max-w-2xl space-y-4">
    <header className="space-y-1">
      <h1 className="text-2xl font-bold">{order.number}</h1>
      <p className="text-zinc-300">{[DEVICE_LABELS[order.deviceType], order.brand, order.model].filter(Boolean).join(" · ")}</p>
      <p className="text-sm text-zinc-400">{STATUS_LABELS[order.status] ?? order.status}{order.quantity > 1 && ` · ${order.quantity} adet`}{order.serialNo && ` · Seri ${order.serialNo}`}</p>
    </header>
    <section className={cardCls + " flex flex-wrap items-center justify-between gap-3"}>
      <div><p className="text-xs text-zinc-400">Müşteri</p><p className="font-semibold">{customer}</p></div>
      {tel && <a className={btnGhost} href={`tel:${tel}`}><Phone size={16} /> {phone}</a>}
    </section>
    {windings.length === 0 && <section className={cardCls}>
      <p>Bu iş emri için söküm bilgisi henüz girilmemiş.</p>
      <Link className={btnPrimary + " mt-3 inline-flex"} href={`/is-emirleri/${id}/sokum`}><Cog size={16} /> Sökümü gir</Link>
    </section>}
    {windings.map(r => {
      const mono = isMonophase(r.phase);
      const grams = sumGrams(r.coilWeights ?? []);
      const missing = missingWinding(r);
      return <section key={r.id} className={cardCls + " space-y-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Sargı bilgileri{windings.length > 1 && ` · #${r.id}`}</h2>
          <span className="text-xs text-zinc-400">{formatDate(r.createdAt)}</span>
        </div>
        {missing.length > 0 && <p role="alert" className="rounded-lg border border-red-500/60 bg-red-500/10 p-2 text-sm text-red-200">❗ Eksik: {missing.join(", ")}</p>}
        <p className="text-xs font-semibold uppercase text-accent-400">{mono ? "Ana bobin" : "Sargı"}</p>
        <dl className="grid grid-cols-2 gap-3 text-lg">
          {line("Sipir", r.sipir)}{line("Hatve", r.hatve)}{line("Tel çapı", formatWindingWires(r))}{line("Kalıp", r.mold)}
        </dl>
        {mono && <>
          <p className="text-xs font-semibold uppercase text-accent-400">Yardımcı bobin</p>
          <dl className="grid grid-cols-2 gap-3 text-lg">
            {line("Sipir", r.auxSipir)}{line("Hatve", r.auxHatve)}{line("Tel çapı", formatWireList(r.auxWireDiameters))}
          </dl>
        </>}
        <dl className="grid grid-cols-2 gap-3 border-t border-ink-600 pt-3 text-sm sm:grid-cols-3">
          {line("Faz", r.phase)}{line("kW", r.kw)}{line("HP", r.hp)}{line("Volt", r.volt)}{line("Devir (RPM)", r.rpm)}
          {line("Kutup", r.poleCount)}{line("Oluk", r.slotCount)}{line("Bobin sayısı", r.coilCount)}{line("Paralel tel", r.parallelWires)}
          {line("Bağlantı", r.windingConnection || r.connectionType)}{line("Sarım şekli", r.windingShape)}{line("Gövde", r.frameSize)}
          {grams > 0 && line("Bobin toplamı", `${formatGrams(grams)} (${formatKilos(grams)})`)}
        </dl>
        {r.notes && <p className="whitespace-pre-wrap text-sm text-zinc-300">{r.notes}</p>}
        <div className="flex flex-wrap gap-2">
          <Link className={btnGhost} href={`/bobinaj/${r.id}`}>Tüm kayıt</Link>
          <Link className={btnGhost} href={`/bobinaj/${r.id}/duzenle`}>Düzenle</Link>
        </div>
      </section>;
    })}
    <div className="flex flex-wrap gap-2 pb-4">
      <Link className={btnGhost} href={`/is-emirleri/${id}`}>İş emri</Link>
      {windings.length > 0 && <Link className={btnGhost} href={`/is-emirleri/${id}/sokum`}>Söküm</Link>}
    </div>
  </div>;
}
