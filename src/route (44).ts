import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { reportData, reportKinds } from "@/lib/report-data";
import { renderReport } from "@/lib/pdf-report";

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  const safe = typeof value === "string" && /^[\s\uFEFF]*[=+@-]/.test(text) && !/^-\d+(?:[.,]\d+)?$/.test(text) ? "'" + text : text;
  return '"' + safe.replaceAll('"', '""') + '"';
}

export async function GET(request: Request, { params }: { params: { kind: string } }) {
  const kind = reportKinds.find(key => key === params.kind);
  if (!kind) return new Response(null, { status: 404 });
  await requireUser(kind === "finans" || kind === "bakiyeler" ? "usta" : "personel");
  const query = new URL(request.url).searchParams;
  const id = recordId(query.get("id") ?? undefined);
  const report = await reportData(kind, id, query.get("donem") ?? undefined);
  if (!report) return new Response("Rapor bulunamadı.", { status: 404 });
  const pdf = query.get("bicim") === "pdf";
  const body = pdf ? new Uint8Array(await renderReport(report))
    : "\uFEFF" + [report.columns, ...report.rows].map(row => row.map(csvCell).join(";")).join("\r\n");
  return new Response(body, { headers: {
    "Content-Type": pdf ? "application/pdf" : "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${kind}${id ? "-" + id : ""}.${pdf ? "pdf" : "csv"}"`,
    "Cache-Control": "private, no-store",
  } });
}
