import { formatTL } from "@/lib/format";
import { cardCls } from "@/components/ui";

export function CashChart({ paid, spent }: { paid: number; spent: number }) {
  const max = Math.max(paid, spent, 1);
  return <section className={cardCls}>
    <h2 className="mb-3 font-semibold">Bu ayın nakit akışı</h2>
    {([["Tahsilat", paid, "bg-accent-500"], ["Gider", spent, "bg-rose-400"]] as const).map(([label, value, color]) =>
      <div className="mb-2" key={label}>
        <div className="mb-1 flex justify-between gap-2 text-sm"><span>{label}</span><span>{formatTL(value)}</span></div>
        <div aria-hidden="true" className="h-2 rounded-full bg-ink-900"><div className={"h-2 rounded-full " + color} style={{ width: (value / max * 100) + "%" }} /></div>
      </div>)}
  </section>;
}
