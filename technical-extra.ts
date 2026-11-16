import { and, asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { decimal, field } from "@/lib/record-input";

export type Extra = Record<string, string | number | null>;
export async function getExtraFields(device: string) {
  const f = schema.technicalFields;
  return getDb().select().from(f).where(and(eq(f.isSystem, false), eq(f.active, true),
    sql`(cardinality(${f.deviceTypes}) = 0 or ${device} = any(${f.deviceTypes}))`)).orderBy(asc(f.sortOrder), asc(f.id));
}

export function readExtra(form: FormData, definitions: Awaited<ReturnType<typeof getExtraFields>>, previous?: Extra) {
  const extra = { ...previous };
  for (const definition of definitions) {
    const input = `extra-${definition.id}`;
    if (!form.has(input)) continue;
    const value = field(form, input);
    if (!value) { delete extra[definition.key]; continue; }
    if (String(previous?.[definition.key] ?? "") === value) continue;
    if (definition.fieldType === "secim" && !definition.options?.includes(value)) {
      return { error: `${definition.label} için listedeki değerlerden birini seçin.` };
    }
    if (definition.fieldType === "sayi") {
      const number = decimal(value, 10, 6);
      if (!number) return { error: `${definition.label} için geçerli bir sayı girin.` };
      extra[definition.key] = number;
    } else extra[definition.key] = value.slice(0, 300);
  }
  return { extra };
}
