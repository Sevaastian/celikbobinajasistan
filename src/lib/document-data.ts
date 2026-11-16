import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { DEVICE_LABELS, formatDate } from "@/lib/format";
import type { DocumentData } from "@/lib/pdf-document";

const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" });
const fmt = (value: string | number | null) => (value === null ? null : money.format(Number(value)));
const qty = (value: string) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 3 }).format(Number(value));

/** İş emrinden teklif / teslim fişi içeriğini hazırlar. */
export async function documentData(kind: DocumentData["kind"], orderId: number): Promise<DocumentData | null> {
  const db = getDb();
  const { workOrders: o, customers: c, workOrderItems: i, stockItems: s, payments: p } = schema;
  const [row] = await db.select({ order: o, customer: c.name, phone: c.phone }).from(o)
    .innerJoin(c, eq(c.id, o.customerId)).where(eq(o.id, orderId));
  if (!row) return null;
  const [items, [paid]] = await Promise.all([
    db.select({ name: s.name, unit: s.unit, quantity: i.quantity, unitPrice: i.unitPrice }).from(i)
      .innerJoin(s, eq(s.id, i.stockItemId)).where(eq(i.workOrderId, orderId)).orderBy(asc(i.id)),
    db.select({ total: sql<string>`coalesce(sum(${p.amount}), 0)` }).from(p).where(eq(p.workOrderId, orderId)),
  ]);
  const { order } = row;
  const price = order.finalPrice ?? order.estimatedPrice;
  const remaining = price === null ? null : Math.max(Number(price) - Number(paid.total), 0);
  return {
    kind,
    number: order.number,
    date: formatDate(new Date()),
    customer: row.customer,
    phone: row.phone,
    deviceType: DEVICE_LABELS[order.deviceType],
    brand: order.brand,
    model: order.model,
    serialNo: order.serialNo,
    receivedAt: formatDate(order.receivedAt),
    complaint: order.complaint,
    diagnosis: order.diagnosis,
    plannedWork: order.plannedWork,
    items: items.map(v => ({
      name: v.name, quantity: qty(v.quantity), unit: v.unit,
      unitPrice: fmt(v.unitPrice)!, total: fmt(Number(v.quantity) * Number(v.unitPrice))!,
    })),
    estimated: fmt(order.estimatedPrice),
    final: fmt(order.finalPrice),
    paid: fmt(paid.total),
    remaining: fmt(remaining),
    business: {
      name: process.env.BUSINESS_NAME || "ÇELİK BOBİNAJ",
      phone: process.env.BUSINESS_PHONE || undefined,
      address: process.env.BUSINESS_ADDRESS || undefined,
    },
  };
}
