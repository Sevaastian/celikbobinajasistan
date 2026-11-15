import { inputCls, labelCls } from "@/components/ui";

export function Field({ label, name, value, type = "text", required, multiline, inputMode }: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  inputMode?: "numeric" | "decimal";
}) {
  return <label className={multiline ? "sm:col-span-2" : undefined}>
    <span className={labelCls}>{label}</span>
    {multiline
      ? <textarea name={name} defaultValue={value ?? ""} className={inputCls} rows={3} maxLength={5000} required={required} />
      : <input name={name} defaultValue={value ?? ""} className={inputCls} type={type} required={required} inputMode={inputMode} maxLength={300} />}
  </label>;
}

export function SelectField({ label, name, value, options, empty, required }: {
  label: string;
  name: string;
  value?: string | number | null;
  options: ReadonlyArray<readonly [string | number, string]>;
  empty?: string;
  required?: boolean;
}) {
  return <label>
    <span className={labelCls}>{label}</span>
    <select name={name} defaultValue={value ?? ""} className={inputCls} required={required}>
      {empty !== undefined && <option value="">{empty}</option>}
      {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
    </select>
  </label>;
}
