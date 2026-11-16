import { windingWires } from "@/lib/wire-sizes";
import { WireFields } from "@/components/wire-fields";
import { WindingWarning } from "@/components/winding-warning";
import { WindingPreview } from "@/components/winding-preview";
import { CoilWeights } from "@/components/coil-weights";
import { TechnicalExtra } from "@/components/technical-extra";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { WINDING_DEVICES } from "@/lib/format";
import { getDb, schema } from "@/db";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { motorFields, windingFields } from "./fields";
import { saveWinding } from "./actions";

const primaryKeys = new Set(["brand", "model", "serialNo", "kw", "volt", "rpm", "sipir", "hatve", "mold", "notes"]);

type Winding = typeof schema.windingRecords.$inferSelect;

export async function WindingEditor({ current, source, orderId, teardown, customerId, picker }: {
  current?: Winding; source?: Winding; orderId?: number | null; teardown?: boolean; customerId?: number | null;
  picker?: React.ReactNode;
}) {
  const db = getDb();
  const { customers, workOrders } = schema;
  const [clients, orders] = await Promise.all([
    db.select().from(customers).orderBy(asc(customers.name)),
    db.select({ order: workOrders, customer: customers.name }).from(workOrders)
      .innerJoin(customers, eq(workOrders.customerId, customers.id))
      .where(inArray(workOrders.deviceType, [...WINDING_DEVICES])).orderBy(desc(workOrders.id)),
  ]);
  const selected = orders.find(({ order }) => order.id === orderId)?.order;
  const data = current ?? source;
  return <div className="space-y-4">
    <h1 className={teardown ? "text-lg font-semibold" : "text-2xl font-bold"}>{current ? `Bobinaj #${current.id} · Düzenle` : "Yeni bobinaj kaydı"}</h1>
    {!current && picker}
    {source && <p className="text-sm text-zinc-400">#{source.id} numaralı kaydın teknik bilgileri aktarıldı.</p>}
    <RecordForm action={saveWinding.bind(null, current?.id ?? null, source?.id ?? null)}>
      {teardown && selected ? <><input type="hidden" name="teardown" value="1" /><input type="hidden" name="workOrderId" value={selected.id} /></> : <section className={cardCls + " grid gap-4 sm:grid-cols-2"}>
        <SelectField name="workOrderId" label="Motor iş emri" empty="İş emri seçilmedi"
          value={current?.workOrderId ?? selected?.id}
          options={orders.map(({ order, customer }) => [order.id, [order.number, customer, order.brand, order.model].filter(Boolean).join(" · ")])} />
        <SelectField name="customerId" label="Müşteri (iş emri yoksa)" empty="Müşteri seçilmedi"
          value={current ? (current.workOrderId || selected ? null : current.customerId) : selected ? null : customerId}
          options={clients.map(client => [client.id, client.name])} />
      </section>}
      {([[ "Motor bilgileri", motorFields], ["Sargı bilgileri", windingFields]] as const).map(([title, fields]) =>
        <section className={cardCls} key={title}>
          <h2 className="mb-3 font-semibold">{title}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.filter(([key]) => primaryKeys.has(key)).map(([key, label, kind]) =>
              <Field key={key} name={key} label={label} value={data?.[key] ?? (
                key === "brand" || key === "model" || key === "serialNo" ? selected?.[key] : undefined
              )} multiline={kind === "multiline"} inputMode={kind === "integer" ? "numeric" : kind === "power" ? "decimal" : undefined} />)}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-accent-400">Diğer teknik alanlar</summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {fields.filter(([key]) => !primaryKeys.has(key)).map(([key, label, kind]) =>
                <Field key={key} name={key} label={label} value={data?.[key]}
                  multiline={kind === "multiline"}
                  inputMode={kind === "integer" ? "numeric" : kind === "power" ? "decimal" : undefined} />)}
            </div>
          </details>
        </section>)}
      <WireFields values={windingWires(data)} />
      <WindingPreview />
      {teardown && <WindingWarning />}
      <CoilWeights values={current?.coilWeights ?? []} initialCount={data?.coilCount ?? null} />
      <details className={cardCls}>
        <summary className="cursor-pointer text-sm text-accent-400">Özel alanlar</summary>
        <div className="mt-3"><TechnicalExtra device="motor" values={data?.extra} /></div>
      </details>
    </RecordForm>
  </div>;
}
