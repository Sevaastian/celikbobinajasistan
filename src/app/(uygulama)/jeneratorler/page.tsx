import { asc, desc } from "drizzle-orm";
import Link from "next/link";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { maintenanceDue } from "@/lib/service-fields";
import { ServiceForm } from "@/components/service-form";
import { cardCls } from "@/components/ui";
import { recordId } from "@/lib/record-input";

export default async function Page({ searchParams }: { searchParams: { musteri?: string; isEmri?: string } }) {
  await requireUser();
  const db = getDb();
  const [rows, clients] = await Promise.all([
    db.select().from(schema.generators).orderBy(desc(schema.generators.id)),
    db.select().from(schema.customers).orderBy(asc(schema.customers.name)),
  ]);
  const filter = recordId(searchParams.musteri);
  const workOrder = recordId(searchParams.isEmri);
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Jeneratörler</h1>
    <details className={cardCls} open={!rows.length}>
      <summary className="mb-3 cursor-pointer font-semibold">Yeni jeneratör</summary>
      <ServiceForm kind="jenerator" clients={clients.map(c => [c.id, c.name])} />
    </details>
    <section className={cardCls + " divide-y divide-ink-600"}>
      {!rows.some(row => !filter || row.customerId === filter) && <p className="py-2 text-zinc-400">Jeneratör kaydı bulunamadı.</p>}
      {rows.filter(row => !filter || row.customerId === filter).map(row => {
        const due = maintenanceDue(row);
        const overdue = (due.date && formatDate(due.date) !== "—" && due.date.valueOf() <= Date.now())
          || (due.hours !== null && row.runningHours !== null && Number(row.runningHours) >= due.hours);
        return <Link className="block py-3 hover:text-accent-400" key={row.id}
          href={`/jeneratorler/${row.id}${workOrder ? `?isEmri=${workOrder}` : ""}`}>
          <p className="font-semibold">{[row.brand, row.model, row.serialNo].filter(Boolean).join(" · ") || `Jeneratör #${row.id}`}</p>
          <p className={overdue ? "text-sm text-red-300" : "text-sm text-zinc-400"}>
            {overdue ? "Bakım zamanı · " : ""}Sonraki bakım {formatDate(due.date)}{due.hours !== null && ` · ${due.hours} saat`}
          </p>
        </Link>;
      })}
    </section>
  </div>;
}
