import { btnGhost } from "@/components/ui";
import type { ReportKind } from "@/lib/report-data";

export function ReportLinks({ kind, id, period }: { kind: ReportKind; id?: number; period?: string }) {
  const query = new URLSearchParams();
  if (id) query.set("id", String(id));
  if (period) query.set("donem", period);
  const base = `/api/rapor/${kind}?${query.toString()}`;
  return <>
    <a className={btnGhost} href={base + (query.size ? "&" : "") + "bicim=pdf"}>PDF indir</a>
    <a className={btnGhost} href={base}>CSV indir</a>
  </>;
}
