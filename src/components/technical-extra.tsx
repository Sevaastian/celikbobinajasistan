import { Field, SelectField } from "@/components/record-fields";
import { getExtraFields, type Extra } from "@/lib/technical-extra";

export async function TechnicalExtra({ device, values }: { device: string; values?: Extra | null }) {
  const definitions = await getExtraFields(device);
  if (!definitions.length) return null;
  return <fieldset className="grid gap-3 sm:grid-cols-2">
    <legend className="mb-2 font-semibold">Ek teknik alanlar</legend>
    {definitions.map(item => {
      const value = values?.[item.key];
      const options = [...new Set([...(item.options ?? []), ...(value != null ? [String(value)] : [])])];
      return item.fieldType === "secim"
        ? <SelectField key={item.id} label={item.label} name={`extra-${item.id}`} empty="Seçilmedi"
          value={value} options={options.map(v => [v, v])} />
        : <Field key={item.id} label={item.label} name={`extra-${item.id}`} value={value}
          inputMode={item.fieldType === "sayi" ? "decimal" : undefined} />;
    })}
  </fieldset>;
}
