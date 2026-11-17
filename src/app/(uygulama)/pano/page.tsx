import { and, asc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { DEVICE_LABELS, STATUS_LABELS } from "@/lib/format";
import { orderMessages, whatsappLink } from "@/lib/whatsapp";
import { cardCls } from "@/components/ui";

export const dynamic = "force-dynamic";

const COLUMNS: { title: string; statuses: (keyof typeof STATUS_LABELS)[] }[] = [
  { title: "Yeni / İnceleme", statuses: ["yeni_geldi", "incelemede"] },
  { title: "Arıza ve onay", statuses: ["ariza_tespit_edildi", "musteri_onayi_bekliyor"] },
  { title: "İşlemde", statuses: ["islemde", "parca_bekliyor"] },
  { title: "Test ve tamamlandı", statuses: ["test_asamasinda", "tamamlandi"] },
  { title: "Teslime hazır", statuses: ["teslime_hazir"] },
];
const OPEN = COLUMNS.flatMap(c => c.statuses);
const NUDGE_DAYS = 3;

export default async function Page() {
  await requireUser();
  const { workOrders: w, customers: c, workOrderStatusHistory: h } = schema;
  const rows = await getDb().select({
    order: w, customer: c.name, phone: c.phone,
    since: sql<string>`coalesce((select max(${h.createdAt}) from ${h} where ${h.workOrderId} = ${w.id}), ${w.receivedAt})`,
  }).from(w).innerJoin(c, eq(c.id, w.customerId))
    .where(inArray(w.status, OPEN as never)).orderBy(asc(w.receivedAt)).limit(400);
  const items = rows.map(r => ({ ...r, days: Math.max(0, Math.floor((Date.now() - new Date(r.since).getTime()) / 86400000)) }));

  const nudges = items.filter(i => (i.order.status === "teslime_hazir" && i.days >= NUDGE_DAYS)
    || (i.order.status === "musteri_onayi_bekliyor" && i.days >= 2)).sort((a, b) => b.days - a.days);

  const card = (i: (typeof items)[number]) => <Link key={i.order.id} href={`/is-emirleri/${i.order.id}`}
    className="block rounded-lg border border-ink-600 bg-ink-900 p-3 hover:border-accent-500">
    <p className="flex items-center justify-between gap-2 text-sm font-semibold">
      <span>{i.order.number}{i.order.quantity > 1 && <span className="ml-1 text-xs text-accent-400">×{i.order.quantity}</span>}</span>
      <span className={"text-xs font-normal " + (i.days >= 7 ? "text-red-300" : "text-zinc-400")}>{i.days === 0 ? "bugün" : `${i.days} gün`}</span>
    </p>
    <p className="text-sm">{i.customer}</p>
    <p className="text-xs text-zinc-400">{[DEVICE_LABELS[i.order.deviceType], i.order.brand, i.order.model].filter(Boolean).join(" · ")}</p>
    {i.order.status !== COLUMNS.find(col => col.statuses.includes(i.order.status))?.statuses[0] && <p className="mt-1 text-xs text-accent-400">{STATUS_LABELS[i.order.status]}</p>}
  </Link>;

  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold">Atölye Panosu</h1>
      <p className="text-sm text-zinc-400">Teslim edilmemiş {items.length} iş. Sayı yanındaki gün, son durum değişikliğinden beri geçen süredir.</p></header>

    {nudges.length > 0 && <section className={cardCls + " space-y-2 border-amber-500/50"}>
      <h2 className="font-semibold">📣 Müşteriye haber ver ({nudges.length})</h2>
      <p className="text-xs text-zinc-400">Teslime hazır olup {NUDGE_DAYS}+ gündür alınmayanlar ve 2+ gündür onay bekleyenler. Her satırdaki düğme hazır mesajla WhatsApp'ı açar.</p>
      <ul className="divide-y divide-ink-600">
        {nudges.map(i => {
          const messages = orderMessages(i.customer, i.order);
          const msg = messages.find(m => m.key === (i.order.status === "teslime_hazir" ? "hazir" : "onay"))!;
          const link = whatsappLink(i.phone, msg.text);
          return <li key={i.order.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <Link href={`/is-emirleri/${i.order.id}`} className="min-w-0 text-sm">
              <span className="font-medium">{i.order.number} · {i.customer}</span>
              <span className="block text-xs text-zinc-400">{STATUS_LABELS[i.order.status]} · {i.days} gündür</span>
            </Link>
            {link ? <a href={link} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm text-emerald-300"><MessageCircle size={14} /> {i.order.status === "teslime_hazir" ? "Teslime hazır yaz" : "Onay iste"}</a>
              : <span className="text-xs text-zinc-500">{i.phone ? "Numara geçersiz" : "Telefon yok"}</span>}
          </li>;
        })}
      </ul>
    </section>}

    <div className="grid gap-3 lg:grid-cols-5">
      {COLUMNS.map(col => {
        const list = items.filter(i => col.statuses.includes(i.order.status));
        return <section key={col.title} className="space-y-2">
          <h2 className="flex items-center justify-between rounded-lg bg-ink-800 px-3 py-2 text-sm font-semibold">{col.title}<span className="rounded-full bg-accent-500/20 px-2 text-xs text-accent-400">{list.length}</span></h2>
          {list.length === 0 ? <p className="px-1 text-xs text-zinc-500">Boş</p> : list.map(card)}
        </section>;
      })}
    </div>
  </div>;
}
