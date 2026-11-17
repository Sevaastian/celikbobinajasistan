import { asc } from "drizzle-orm";
import Link from "next/link";
import { ClipboardPlus } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { DEVICE_LABELS } from "@/lib/format";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { btnGhost, cardCls } from "@/components/ui";
import { PlateFields } from "@/components/plate-fields";
import { saveOrder } from "../actions";

export default async function Page({ searchParams }: { searchParams: { musteri?: string } }) {
  await requireUser();
  const c = schema.customers;
  const customers = await getDb().select({ id: c.id, name: c.name, phone: c.phone }).from(c).orderBy(asc(c.name));
  return <div className="mx-auto max-w-3xl space-y-4">
    <header className="cb-heading flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><ClipboardPlus className="text-accent-400" size={24} />
        <h1 className="text-2xl font-bold">Hızlı cihaz kabulü</h1></div>
      <Link href="/is-emirleri/yeni" className={btnGhost}>Ayrıntılı form</Link>
    </header>
    <section className={cardCls}>
      <div className="mb-4 flex justify-end"><Link className={btnGhost} href="/musteriler/yeni?sonra=kabul">Yeni müşteri</Link></div>
      {customers.length ? <RecordForm action={saveOrder.bind(null, null)} label="İş emrini aç">
        <input type="hidden" name="quickIntake" value="1" />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="customerId" label="Müşteri" required empty="Müşteri seçin" value={searchParams.musteri}
            options={customers.map(c => [c.id, [c.name, c.phone].filter(Boolean).join(" · ")])} />
          <SelectField name="deviceType" label="Cihaz türü" value="motor" options={Object.entries(DEVICE_LABELS)} />
          <PlateFields ocr={process.env.ANTHROPIC_API_KEY ? "claude" : "free"} />
          <Field name="quantity" label="Adet (aynı işten kaç tane)" type="number" inputMode="numeric" value={1} />
          <Field name="complaint" label="Arıza şikâyeti" multiline required />
        </div>
      </RecordForm> : <p className="text-sm text-zinc-300">Cihaz kabulü için önce bir müşteri ekleyin.</p>}
    </section>
  </div>;
}
