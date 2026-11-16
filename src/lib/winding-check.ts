/** Söküm sonunda mutlaka girilmesi gereken değerler. */
export const REQUIRED_WINDING = [
  ["sipir", "Sipir"], ["hatve", "Hatve"], ["wire", "Tel çapı"],
] as const;

type WindingLike = { sipir?: string | null; hatve?: string | null; wireDiameter?: string | null } | null | undefined;

/** Eksik olan zorunlu değerlerin adları (kayıt listesinde ve sayfalarda uyarı için). */
export function missingWinding(record: WindingLike) {
  if (!record) return REQUIRED_WINDING.map(([, label]) => label);
  const missing: string[] = [];
  if (!record.sipir?.trim()) missing.push("Sipir");
  if (!record.hatve?.trim()) missing.push("Hatve");
  if (!record.wireDiameter) missing.push("Tel çapı");
  return missing;
}
