import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatTL } from "@/lib/format";
import { categories } from "@/lib/module-labels";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { saveStock, saveSupplier } from "./actions";
import { movements } from "./movement";

type Item = typeof schema.stockItems.$inferSelect;
type Supplier = typeof schema.suppliers.$inferSelect;

function Product({ item, suppliers }: { item?: Item; suppliers: Supplier[] }) {
  return <RecordForm action={saveStock.bind(null, item?.id ?? null)}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Ürün adı" name="name" required value={item?.name} />
      <SelectField label="Kategori" name="category" value={item?.category ?? "diger"} options={categories} />
      <Field label="Birim" name="unit" required value={item?.unit ?? "adet"} />
      <Field label="Tel çapı (mm)" name="wireDiameter" value={item?.wireDiameter} inputMode="decimal" />
      <Field label="Alış fiyatı (₺)" name="buyPrice" value={item?.buyPrice} inputMode="decimal" />
      <Field label="Satış fiyatı (₺)" name="sellPrice" value={item?.sellPrice} inputMode="decimal" />
      <Field label="Minimum miktar" name="minQuantity" value={item?.minQuantity} inputMode="decimal" />
      <SelectField label="Tedarikçi" name="supplierId" empty="Seçilmedi" value={item?.supplierId} options={suppliers.map(s => [s.id, s.name])} />
      <label><input type="checkbox" name="active" defaultChecked={item?.active ?? true} /> Aktif ürün</label>
    </div>
  </RecordForm>;
}

function SupplierForm({ supplier }: { supplier?: Supplier }) {
  return <RecordForm action={saveSupplier.bind(null, supplier?.id ?? null)}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tedarikçi adı" name="name" required value={supplier?.name} />
      <Field label="Telefon" name="phone" value={supplier?.phone} />
      <Field label="Adres" name="address" multiline value={supplier?.address} />
      <Field label="Notlar" name="notes" multiline value={supplier?.notes} />
    </div>
  </RecordForm>;
}

export default async function Page() {
  const user = await requireUser();
  const canEdit = user.role !== "personel";
  const db = getDb();
  const { stockItems: s, stockMovements: m, suppliers: t } = schema;
  const [items, history, suppliers] = await Promise.all([
    db.select().from(s).orderBy(asc(s.name)),
    db.select({ movement: m, name: s.name }).from(m).innerJoin(s, eq(s.id, m.stockItemId)).orderBy(desc(m.id)).limit(100),
    db.select().from(t).orderBy(asc(t.name)),
  ]);
  return <div className="space-y-4">
    <header className="flex flex-wrap justify-between gap-3">
      <h1 className="text-2xl font-bold">Stok ve Depo</h1>
      {canEdit && <Link className={btnPrimary} href="/stok/giris">Stok hareketi ekle</Link>}
    </header>
    {canEdit && <details className={cardCls}><summary className="cursor-pointer font-semibold">Yeni ürün</summary>
      <div className="mt-4"><Product suppliers={suppliers} /></div></details>}
    {items.map(item => <section key={item.id} className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="font-semibold">{item.name}{!item.active && " · Pasif"}</h2>
          <p className="text-sm text-zinc-400">{formatTL(item.buyPrice)} alış · {formatTL(item.sellPrice)} satış · {suppliers.find(s => s.id === item.supplierId)?.name ?? "Tedarikçi seçilmedi"}</p></div>
        <span className={item.active && Number(item.minQuantity) > 0 && Number(item.quantity) <= Number(item.minQuantity) ? "text-red-300" : ""}>
          {Number(item.quantity)} {item.unit} · Alt sınır {Number(item.minQuantity)}
        </span>
        {canEdit && item.active && <Link href={`/stok/giris?urun=${item.id}`} className={btnGhost}>Hareket</Link>}
      </div>
      {canEdit && <details className="mt-3"><summary className="cursor-pointer text-sm text-accent-400">Ürünü düzenle</summary>
        <div className="mt-3"><Product item={item} suppliers={suppliers} /></div></details>}
    </section>)}
    <section className={cardCls}><h2 className="mb-3 font-semibold">Son stok hareketleri</h2>
      {history.length === 0 && <p>Stok hareketi bulunamadı.</p>}
      {history.map(({ movement: m, name }) => <p key={m.id} className="border-t border-ink-600 py-2 text-sm">
        {formatDateTime(m.createdAt)} · {name} · {movements.find(([key]) => key === m.type)?.[1]} · {Number(m.quantity)}{m.note && ` · ${m.note}`}
        {m.workOrderId && <> · <Link className="text-accent-400" href={`/is-emirleri/${m.workOrderId}`}>İş emri</Link></>}
      </p>)}
    </section>
    {canEdit && <section className={cardCls}><h2 className="mb-3 font-semibold">Tedarikçiler</h2>
      <details className="pb-3"><summary className="cursor-pointer text-accent-400">Yeni tedarikçi</summary><SupplierForm /></details>
      {suppliers.map(s => <details className="border-t border-ink-600 py-3" key={s.id}><summary className="cursor-pointer">{s.name}</summary><SupplierForm supplier={s} /></details>)}
    </section>}
  </div>;
}
