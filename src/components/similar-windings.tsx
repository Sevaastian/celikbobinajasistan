import Link from "next/link";
import type { SimilarItem } from "@/lib/similar";

/** Benzer motorların sipir / hatve / tel özeti (sunucu ve istemci sayfalarında kullanılır). */
export function SimilarWindingsView({ items, title = "Benzer motorlar" }: { items: SimilarItem[]; title?: string }) {
  if (items.length === 0) return null;
  return <section className="rounded-xl border border-accent-500/40 bg-ink-800 p-3">
    <h3 className="mb-1 font-semibold">{title}</h3>
    <p className="mb-2 text-xs text-zinc-400">Aynı güç ve kutuptaki daha önce sardığımız motorlar. Sadece fikir verir, söküm bilgisi esastır.</p>
    <ul className="divide-y divide-ink-600">
      {items.map(item => <li key={item.id}>
        <Link href={`/bobinaj/${item.id}`} className="block py-2 hover:text-accent-400">
          <p className="text-sm font-medium">{item.title} · {item.kw} kW{item.rpm ? ` · ${item.rpm} d/d` : ""}{item.poles ? ` · ${item.poles} kutup` : ""}
            <span className="ml-2 text-xs font-normal text-zinc-400">{item.date}</span></p>
          <p className="text-sm text-zinc-300">Sipir {item.sipir ?? "—"} · Hatve {item.hatve ?? "—"}{item.wires && ` · ${item.wires}`}{item.mold && ` · Kalıp ${item.mold}`}</p>
          {item.aux && <p className="text-xs text-zinc-400">{item.aux}</p>}
        </Link>
      </li>)}
    </ul>
  </section>;
}
