import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { formatTL } from "@/lib/format";
import { cardCls } from "@/components/ui";
import { Movement } from "../../stok/movement";

export async function OrderMaterials({ orderId, open }: { orderId: number; open: boolean }) {
  const { workOrderItems: i, stockItems: s } = schema;
  const rows = await getDb().select({ item: i, name: s.name, unit: s.unit }).from(i)
    .innerJoin(s, eq(s.id, i.stockItemId)).where(eq(i.workOrderId, orderId)).orderBy(desc(i.id));
  return <>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Kullanılan malzemeler</h2>
      {!rows.length && <p className="text-zinc-400">Malzeme kaydı yok.</p>}
      {rows.map(({ item, name, unit }) => <p key={item.id} className="border-t border-ink-600 py-2 text-sm">
        {name} · {Number(item.quantity)} {unit} · Birim fiyat {formatTL(item.unitPrice)}
      </p>)}
    </section>
    {open && <Movement orderId={orderId} />}
  </>;
}
