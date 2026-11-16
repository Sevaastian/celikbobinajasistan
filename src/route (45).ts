import { requireUser } from "@/lib/auth";
import { TEMPLATE_EXAMPLE, TEMPLATE_HEADERS } from "@/lib/winding-import";

const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export async function GET() {
  await requireUser("usta");
  const body = "﻿" + [TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].map(r => r.map(cell).join(";")).join("\r\n") + "\r\n";
  return new Response(body, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="bobinaj-aktarim-sablonu.csv"',
    "Cache-Control": "private, no-store",
  } });
}
