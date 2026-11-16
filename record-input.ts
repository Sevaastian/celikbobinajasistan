export function field(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function recordId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && id <= 2147483647 ? id : null;
}

export function decimal(value: string, digits: number, scale: number) {
  const normalized = value.replace(",", ".");
  return new RegExp(`^\\d{1,${digits}}(?:\\.\\d{1,${scale}})?$`).test(normalized)
    ? normalized : null;
}

export function localDateTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short",
  }).format(date).replace(" ", "T");
}

export function parseLocalDateTime(value: string) {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value) || value.startsWith("0000")) return null;
  const date = new Date(value + ":00+03:00");
  return Number.isFinite(date.valueOf()) && localDateTime(date) === value ? date : null;
}
