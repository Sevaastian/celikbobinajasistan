import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { DEVICE_LABELS } from "@/lib/format";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { cardCls } from "@/components/ui";
import { saveTechnicalField } from "./actions";

const kinds = [["metin", "Metin"], ["sayi", "Sayı"], ["secim", "Seçim"]] as const;

function Editor({ value }: { value?: typeof schema.technicalFields.$inferSelect }) {
  return <RecordForm action={saveTechnicalField.bind(null, value?.id ?? null)}>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Alan adı" name="label" value={value?.label} required />
      {value ? <div className="text-sm text-zinc-300">
        <p>Alan tipi · {kinds.find(([key]) => key === value.fieldType)?.[1]}</p>
        <input type="hidden" name="fieldType" value={value.fieldType} />
      </div> : <SelectField label="Alan tipi" name="fieldType" options={kinds} />}
      {(!value || value.fieldType === "secim") &&
        <Field label="Seçenekler (seçim alanı için her satıra bir seçenek)" name="options" multiline value={value?.options?.join("\n")} />}
      <fieldset className="space-y-2 sm:col-span-2">
        <legend className="mb-2 text-sm text-zinc-300">Cihaz türleri</legend>
        <div className="flex flex-wrap gap-4">
          {Object.entries(DEVICE_LABELS).map(([key, label]) => <label className="flex items-center gap-2 text-sm" key={key}>
            <input type="checkbox" name="deviceTypes" value={key}
              defaultChecked={value ? value.deviceTypes.length === 0 || value.deviceTypes.includes(key) : key === "motor"} />
            {label}
          </label>)}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={value?.active ?? true} /> Aktif</label>
    </div>
  </RecordForm>;
}

export default async function Page() {
  await requireUser("yonetici");
  const table = schema.technicalFields;
  const fields = await getDb().select().from(table).where(eq(table.isSystem, false)).orderBy(asc(table.label));
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Teknik Alanlar</h1>
    <p className="text-sm text-zinc-400">Motor alanları bobinaj formunda, diğer cihaz alanları servis formunda görünür. “Diğer” alanları ilgili iş emrinin düzenleme ekranında görünür.</p>
    <section className={cardCls}>
      <h2 className="mb-3 font-semibold">Yeni teknik alan</h2>
      <Editor />
    </section>
    {fields.map(item => <details key={item.id} className={cardCls}>
      <summary className="cursor-pointer font-semibold">{item.label}{!item.active && " · Pasif"}</summary>
      <div className="mt-4"><Editor value={item} /></div>
    </details>)}
  </div>;
}
