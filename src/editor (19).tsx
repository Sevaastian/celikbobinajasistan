import { TechnicalExtra } from "@/components/technical-extra";
import { asc, eq, or } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { btnGhost, cardCls } from "@/components/ui";
import { DEVICE_LABELS } from "@/lib/format";
import { localDateTime } from "@/lib/record-input";
import { UnitPrice } from "@/components/unit-price";
import { saveOrder } from "./actions";

export async function OrderEditor({ order, customerId, deviceType }: {
  order?: typeof schema.workOrders.$inferSelect;
  customerId?: number | null;
  deviceType?: string;
}) {
  const db = getDb();
  const { customers, users } = schema;
  const [clients, staff] = await Promise.all([
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).orderBy(asc(customers.name)),
    db.select({ id: users.id, name: users.fullName, active: users.active }).from(users)
      .where(or(eq(users.active, true), order?.assignedUserId ? eq(users.id, order.assignedUserId) : undefined))
      .orderBy(asc(users.fullName)),
  ]);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">{order ? `${order.number} · Düzenle` : "Yeni iş emri"}</h1>
    {clients.length ? <section className={cardCls}>
      <RecordForm action={saveOrder.bind(null, order?.id ?? null)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Müşteri" name="customerId" required empty="Müşteri seçin"
            value={order?.customerId ?? customerId}
            options={clients.map(c => [c.id, c.phone ? `${c.name} · ${c.phone}` : c.name])} />
          <SelectField label="Cihaz türü" name="deviceType" value={order?.deviceType ?? (deviceType && Object.hasOwn(DEVICE_LABELS, deviceType) ? deviceType : "motor")} options={Object.entries(DEVICE_LABELS)} />
          <Field label="Marka" name="brand" value={order?.brand} />
          <Field label="Model" name="model" value={order?.model} />
          <Field label="Seri numarası" name="serialNo" value={order?.serialNo} />
          <Field label="Geliş tarihi (Türkiye saati)" name="receivedAt" type="datetime-local" required value={localDateTime(order?.receivedAt ?? new Date())} />
          <SelectField label="Atanan personel" name="assignedUserId" empty="Atanmamış" value={order?.assignedUserId}
            options={staff.map(s => [s.id, s.active ? s.name : `${s.name} (pasif)`])} />
          <Field label="Adet (aynı işten kaç tane geldi)" name="quantity" type="number" inputMode="numeric" value={order?.quantity ?? 1} />
          <UnitPrice />
          <Field label="Tahmini ücret (₺) — tüm adetin toplamı" name="estimatedPrice" inputMode="decimal" value={order?.estimatedPrice} />
          <Field label="Kesin ücret (₺) — tüm adetin toplamı" name="finalPrice" inputMode="decimal" value={order?.finalPrice} />
          <Field label="Arıza şikâyeti" name="complaint" multiline value={order?.complaint} />
          <Field label="Arıza tespiti" name="diagnosis" multiline value={order?.diagnosis} />
          <Field label="Yapılacak işlemler" name="plannedWork" multiline value={order?.plannedWork} />
        </div>
        {(order?.deviceType ?? deviceType) === "diger" && <TechnicalExtra device="diger" values={order?.extra} />}
      </RecordForm>
    </section> : <section className={cardCls}>
      <p className="mb-3">İş emri açmak için önce müşteri ekleyin.</p>
      <Link href="/musteriler/yeni" className={btnGhost}>Yeni müşteri</Link>
    </section>}
  </div>;
}
