import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { moveStock } from "./actions";

export const movements = [["giris", "Giriş"], ["cikis", "Çıkış"], ["sayim_duzeltme", "Sayım düzeltme"], ["iade", "Depoya iade"]] as const;

export async function Movement({ orderId, stockId }: { orderId?: number; stockId?: number | null }) {
  const { stockItems: s } = schema;
  const rows = await getDb().select().from(s).where(eq(s.active, true)).orderBy(asc(s.name));
  return <section className={cardCls}>
    <h2 className="mb-3 font-semibold">{orderId ? "İş emrine malzeme ekle" : "Stok hareketi"}</h2>
    {rows.length === 0 ? <p>Önce stok ürünü ekleyin.</p> : <RecordForm action={moveStock.bind(null, orderId ?? null)}>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="stockId" label="Ürün" required empty="Ürün seçin" value={stockId}
          options={rows.map(s => [s.id, `${s.name} · ${Number(s.quantity)} ${s.unit}`])} />
        {!orderId && <SelectField name="type" label="Hareket" options={movements} />}
        <Field name="quantity" label={orderId ? "Kullanılan miktar" : "Miktar (sayım düzeltmesinde sayılan toplam)"} required inputMode="decimal" />
        <Field name="note" label="Not" />
      </div>
    </RecordForm>}
  </section>;
}
