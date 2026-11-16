import { asc, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { localDateTime, recordId } from "@/lib/record-input";
import { methods } from "@/lib/module-labels";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { recordFinance } from "./actions";

export async function FinanceEditor({ kind, customer, order }: { kind: "payment" | "expense"; customer?: string; order?: string }) {
  await requireUser("usta");
  const db = getDb();
  const { workOrders: w, customers: c, suppliers: s } = schema;
  const [clients, orders, suppliers] = await Promise.all([
    kind === "payment" ? db.select().from(c).orderBy(asc(c.name)) : [],
    kind === "payment" ? db.select({ id: w.id, customerId: w.customerId, number: w.number, name: c.name })
      .from(w).innerJoin(c, eq(c.id, w.customerId)).where(ne(w.status, "iptal_edildi")).orderBy(desc(w.id)) : [],
    kind === "expense" ? db.select().from(s).orderBy(asc(s.name)) : [],
  ]);
  const orderId = recordId(order);
  const customerId = orders.find(w => w.id === orderId)?.customerId ?? recordId(customer);
  return <section className={cardCls}>
    <h1 className="mb-4 text-2xl font-bold">{kind === "payment" ? "Tahsilat ekle" : "Gider ekle"}</h1>
    <RecordForm action={recordFinance.bind(null, kind)}>
      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "payment" ? <>
          <SelectField name="customerId" label="Müşteri" required empty="Müşteri seçin" value={customerId} options={clients.map(c => [c.id, c.name])} />
          <SelectField name="orderId" label="İş emri" empty="Genel müşteri tahsilatı" value={orderId}
            options={orders.filter(w => !customerId || w.customerId === customerId).map(w => [w.id, `${w.number} · ${w.name}`])} />
        </> : <>
          <Field name="category" label="Gider kategorisi (ör. Malzeme alışı)" required />
          <SelectField name="supplierId" label="Tedarikçi" empty="Seçilmedi" options={suppliers.map(s => [s.id, s.name])} />
        </>}
        <Field label="Tutar (₺)" name="amount" required inputMode="decimal" />
        <SelectField label="Ödeme yöntemi" name="method" options={methods} />
        <Field label="Tarih (Türkiye saati)" name="date" required type="datetime-local" value={localDateTime(new Date())} />
        <Field label="Açıklama" name="note" multiline />
      </div>
    </RecordForm>
  </section>;
}
