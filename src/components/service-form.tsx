import { TechnicalExtra } from "@/components/technical-extra";
import type { Extra } from "@/lib/technical-extra";
import { Field, SelectField } from "@/components/record-fields";
import { RecordForm } from "@/components/record-form";
import { saveService } from "@/app/servis-actions";
import { serviceFields, type ServiceKind } from "@/lib/service-fields";

type Value = { id: number; [key: string]: unknown };
type Option = readonly [number, string];

export function ServiceForm({ kind, value, parentId, orders, clients, operations = [], selectedOrder }: {
  kind: ServiceKind; value?: Value; parentId?: number; selectedOrder?: number | null;
  orders?: Option[]; clients?: Option[]; operations?: string[];
}) {
  const chosen = Array.isArray(value?.operations) ? value.operations as string[] : [];
  function initial(key: string) {
    const v = value?.[key];
    if (typeof v === "string" || typeof v === "number") return v;
    return key === "serviceDate" ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date()) : undefined;
  }
  return <RecordForm action={saveService.bind(null, kind, value?.id ?? null, parentId ?? null)}>
    <div className="grid gap-4 sm:grid-cols-2">
      {orders && <SelectField name="workOrderId" label="İş emri" empty="Seçilmedi" required={kind !== "service"}
        options={orders} value={initial("workOrderId") ?? selectedOrder} />}
      {clients && <SelectField name="customerId" label="Müşteri" empty="Seçilmedi" options={clients} value={initial("customerId")} />}
      {kind === "service" && <SelectField name="kind" label="Servis türü" options={[["bakim", "Bakım"], ["ariza", "Arıza"]]} value={initial("kind")} />}
      {serviceFields[kind].map(([key, label, type]) => <Field name={key} label={label} key={key} value={initial(key)}
        required={type === "date"} type={type === "date" ? "date" : undefined} multiline={type === "long"}
        inputMode={type === "integer" ? "numeric" : type && type !== "date" && type !== "long" ? "decimal" : undefined} />)}
      {kind === "el_aleti" && <>
        <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm">Hazır işlemler</legend>
          <div className="flex flex-wrap gap-3">{[...new Set([...operations, ...chosen])].map(operation =>
            <label key={operation} className="text-sm"><input type="checkbox" name="operations" value={operation}
              defaultChecked={chosen.includes(operation)} /> {operation}</label>)}</div>
        </fieldset>
        <Field name="additionalOperations" label="Diğer işlemler (her satıra bir işlem)" multiline />
      </>}
    </div>
    {kind !== "service" && <TechnicalExtra device={kind} values={value?.extra as Extra | undefined} />}
  </RecordForm>;
}
