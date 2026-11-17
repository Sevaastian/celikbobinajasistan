/** Söküm sonunda mutlaka girilmesi gereken değerler. */
export const REQUIRED_WINDING = [
  ["sipir", "Sipir"], ["hatve", "Hatve"], ["wire", "Tel çapı"],
] as const;

/** Faz alanı serbest metin olabildiği için (eski/aktarılmış kayıtlar) "Monofaze", "mono", "1" gibi yazımları tanır. */
export function isMonophase(phase: string | null | undefined) {
  const v = (phase ?? "").toLocaleLowerCase("tr").trim();
  return v.startsWith("mono") || v === "1" || v === "1f" || v.startsWith("tek");
}

type WindingLike = {
  sipir?: string | null; hatve?: string | null; wireDiameter?: string | null;
  phase?: string | null; auxSipir?: string | null; auxHatve?: string | null; auxWireDiameters?: string[] | null;
} | null | undefined;

/** Eksik olan zorunlu değerlerin adları (kayıt listesinde ve sayfalarda uyarı için). */
export function missingWinding(record: WindingLike) {
  if (!record) return REQUIRED_WINDING.map(([, label]) => label);
  const mono = isMonophase(record.phase);
  const missing: string[] = [];
  if (!record.sipir?.trim()) missing.push(mono ? "Ana sipir" : "Sipir");
  if (!record.hatve?.trim()) missing.push(mono ? "Ana hatve" : "Hatve");
  if (!record.wireDiameter) missing.push(mono ? "Ana tel çapı" : "Tel çapı");
  if (mono) {
    if (!record.auxSipir?.trim()) missing.push("Yardımcı sipir");
    if (!record.auxHatve?.trim()) missing.push("Yardımcı hatve");
    if (!(record.auxWireDiameters ?? []).some(Boolean)) missing.push("Yardımcı tel çapı");
  }
  return missing;
}
