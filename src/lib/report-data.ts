import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { balances, financePeriod } from "@/lib/finance";
import { DEVICE_LABELS, STATUS_LABELS, formatDateTime, formatTL } from "@/lib/format";
import { categories, methods } from "@/lib/module-labels";
import { windingWires, formatWireSize } from "@/lib/wire-sizes";
import { motorFields, windingFields } from "@/app/(uygulama)/bobinaj/fields";

export const reportKinds = ["is-emri", "bobinaj", "musteri", "stok", "finans", "bakiyeler"] as const;
export type ReportKind = typeof reportKinds[number];
export type Report = { title: string; columns: string[]; rows: (string | number | null)[][] };

export async function reportData(kind: ReportKind, id: number | null, period?: string): Promise<Report | null> {
  const db = getDb();
  const { workOrders: o, customers: c, windingRecords: w, users, stockItems: s, suppliers: t, payments: p, expenses: e } = schema;
  if (kind === "stok") {
    const rows = await db.select({ item: s, supplier: t.name }).from(s).leftJoin(t, eq(s.supplierId, t.id)).orderBy(asc(s.name));
    return { title: "Stok Raporu", columns: ["Ürün", "Kategori", "Miktar", "Birim", "Alt sınır", "Alış (TL)", "Satış (TL)", "Tedarikçi", "Durum"],
      rows: rows.map(({ item: v, supplier }) => [v.name, categories.find(([key]) => key === v.category)?.[1] ?? v.category,
        v.quantity, v.unit, v.minQuantity, v.buyPrice, v.sellPrice, supplier, v.active ? "Aktif" : "Pasif"]) };
  }
  if (kind === "bakiyeler") {
    const rows = await balances();
    return { title: "Müşteri Bakiyeleri", columns: ["Müşteri", "Kesin iş tutarı (TL)", "Tahsilat (TL)", "Net borç (TL)"],
      rows: rows.map(v => [v.name, v.billed, v.paid, v.balance]) };
  }
  if (kind === "finans") {
    const { key, from, to } = financePeriod(period);
    const [payments, expenses] = await Promise.all([
      db.select({ item: p, name: c.name }).from(p).innerJoin(c, eq(p.customerId, c.id)).where(and(gte(p.paidAt, from), lt(p.paidAt, to))),
      db.select().from(e).where(and(gte(e.spentAt, from), lt(e.spentAt, to))),
    ]);
    const rows = [
      ...payments.map(({ item, name }) => ({ date: item.paidAt, type: "Tahsilat", name, item, note: item.note })),
      ...expenses.map(item => ({ date: item.spentAt, type: "Gider", name: item.category, item, note: item.description })),
    ].sort((a, b) => b.date.valueOf() - a.date.valueOf());
    return { title: `Finans Raporu (${key})`, columns: ["Tarih", "Tür", "Müşteri veya kategori", "Tutar (TL)", "Yöntem", "Açıklama"],
      rows: rows.map(({ date, type, name, item, note }) => [formatDateTime(date), type, name, item.amount, methods.find(([k]) => k === item.method)?.[1] ?? item.method, note]) };
  }
  if (!id) return null;
  if (kind === "is-emri") {
    const [row] = await db.select({ order: o, customer: c.name, phone: c.phone, assignee: users.fullName }).from(o)
      .innerJoin(c, eq(c.id, o.customerId)).leftJoin(users, eq(users.id, o.assignedUserId)).where(eq(o.id, id));
    if (!row) return null;
    const { order: a } = row;
    return { title: `İş Emri ${a.number}`, columns: ["Alan", "Değer"], rows: [
      ["Müşteri", row.customer], ["Telefon", row.phone], ["Cihaz türü", DEVICE_LABELS[a.deviceType]],
      ["Marka", a.brand], ["Model", a.model], ["Seri numarası", a.serialNo], ["Geliş", formatDateTime(a.receivedAt)],
      ["Durum", STATUS_LABELS[a.status]], ["Teslim", formatDateTime(a.deliveredAt)], ["Personel", row.assignee],
      ["Arıza şikâyeti", a.complaint], ["Arıza tespiti", a.diagnosis], ["Yapılacak işlemler", a.plannedWork],
      ["Tahmini ücret", a.estimatedPrice === null ? null : formatTL(a.estimatedPrice)],
      ["Kesin ücret", a.finalPrice === null ? null : formatTL(a.finalPrice)],
    ] };
  }
  if (kind === "bobinaj") {
    const [row] = await db.select({ record: w, customer: c.name, order: o.number }).from(w)
      .leftJoin(c, eq(c.id, w.customerId)).leftJoin(o, eq(o.id, w.workOrderId)).where(eq(w.id, id));
    if (!row) return null;
    const { technicalFields: f } = schema;
    const fields = await db.select({ key: f.key, label: f.label }).from(f);
    const labels = new Map(fields.map(v => [v.key, v.label]));
    return { title: `Bobinaj Teknik Formu #${id}`, columns: ["Alan", "Değer"], rows: [
      ["Müşteri", row.customer], ["İş emri", row.order], ["Tarih", formatDateTime(row.record.createdAt)],
      ...[...motorFields, ...windingFields].map(([key, label]) => [label, row.record[key]]),
      ...windingWires(row.record).flatMap((size, index) => size ? [[`${index + 1}. tel çapı`, formatWireSize(size)]] : []),
      ...Object.entries(row.record.extra).map(([key, value]) => [labels.get(key) ?? key, value]),
    ] };
  }
  const [client] = await db.select().from(c).where(eq(c.id, id));
  if (!client) return null;
  const [orders, windings, receipts] = await Promise.all([
    db.select().from(o).where(eq(o.customerId, id)).orderBy(desc(o.receivedAt)),
    db.select().from(w).where(eq(w.customerId, id)).orderBy(desc(w.createdAt)),
    db.select().from(p).where(eq(p.customerId, id)).orderBy(desc(p.paidAt)),
  ]);
  return { title: `Müşteri Geçmişi · ${client.name}`, columns: ["Tür", "Tarih", "Kayıt", "Açıklama", "Tutar (TL)"], rows: [
    ...orders.map(o => ["İş emri", formatDateTime(o.receivedAt), o.number, [o.brand, o.model, o.serialNo, STATUS_LABELS[o.status]].filter(Boolean).join(" · "), o.finalPrice]),
    ...windings.map(w => ["Bobinaj", formatDateTime(w.createdAt), `#${w.id}`, [w.brand, w.model, w.serialNo].filter(Boolean).join(" · "), null]),
    ...receipts.map(p => ["Tahsilat", formatDateTime(p.paidAt), `#${p.id}`, p.note, p.amount]),
  ] };
}
