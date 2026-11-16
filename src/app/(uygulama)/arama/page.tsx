import { desc, eq, ilike, or, sql } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { decimal } from "@/lib/record-input";
import { Field } from "@/components/record-fields";
import { btnPrimary, cardCls } from "@/components/ui";

export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  await requireUser();
  const q = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 200) : "";
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const diameter = decimal(q, 3, 3);
  const db = getDb();
  const { customers: c, workOrders: o, windingRecords: w, generators: g } = schema;
  const [clients, orders, windings, generators] = q ? await Promise.all([
    db.select().from(c).where(or(ilike(c.name, pattern), ilike(c.phone, pattern))).orderBy(desc(c.id)).limit(30),
    db.select().from(o).where(or(ilike(o.number, pattern), ilike(o.brand, pattern), ilike(o.model, pattern), ilike(o.serialNo, pattern))).orderBy(desc(o.id)).limit(30),
    db.select().from(w).where(or(ilike(w.brand, pattern), ilike(w.model, pattern), ilike(w.serialNo, pattern), ilike(w.sipir, pattern),
      ilike(w.hatve, pattern), diameter ? or(eq(w.wireDiameter, diameter), eq(w.secondWireDiameter, diameter), sql`${diameter}::numeric = any(${w.additionalWireDiameters})`) : undefined)).orderBy(desc(w.id)).limit(30),
    db.select().from(g).where(or(ilike(g.brand, pattern), ilike(g.model, pattern), ilike(g.serialNo, pattern))).orderBy(desc(g.id)).limit(30),
  ]) : [[], [], [], []];
  const groups = [
    { title: "Müşteriler", path: "/musteriler", rows: clients.map(v => ({ id: v.id, label: [v.name, v.phone] })) },
    { title: "İş emirleri", path: "/is-emirleri", rows: orders.map(v => ({ id: v.id, label: [v.number, v.brand, v.model, v.serialNo] })) },
    { title: "Bobinaj", path: "/bobinaj", rows: windings.map(v => ({ id: v.id, label: [`#${v.id}`, v.brand, v.model, v.serialNo, v.sipir, v.hatve, v.wireDiameter, v.secondWireDiameter, ...(v.additionalWireDiameters ?? [])] })) },
    { title: "Jeneratörler", path: "/jeneratorler", rows: generators.map(v => ({ id: v.id, label: [`#${v.id}`, v.brand, v.model, v.serialNo] })) },
  ];
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Genel Arama</h1>
    <form className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
      <Field label="Müşteri, telefon, cihaz, iş emri veya sargı bilgisi" name="q" value={q} required />
      <button className={btnPrimary}>Ara</button>
    </form>
    {q && groups.every(group => !group.rows.length) && <p role="status">Sonuç bulunamadı.</p>}
    {groups.filter(group => group.rows.length).map(group => <section key={group.path} className={cardCls}>
      <h2 className="mb-2 font-semibold">{group.title}</h2>
      {group.rows.map(row => <Link className="block border-t border-ink-600 py-2 hover:text-accent-400" key={row.id}
        href={`${group.path}/${row.id}`}>{row.label.filter(Boolean).join(" · ")}</Link>)}
    </section>)}
  </div>;
}
