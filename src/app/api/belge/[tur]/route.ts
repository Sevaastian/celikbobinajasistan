import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { documentData } from "@/lib/document-data";
import { renderDocument } from "@/lib/pdf-document";

const kinds = { teklif: "fiyat-teklifi", teslim: "teslim-fisi" } as const;

/** /api/belge/teklif?id=12  veya  /api/belge/teslim?id=12  — telefonda doğrudan PDF görüntüleyicide açılır. */
export async function GET(request: Request, { params }: { params: { tur: string } }) {
  const kind = params.tur === "teklif" || params.tur === "teslim" ? params.tur : null;
  if (!kind) return new Response(null, { status: 404 });
  await requireUser();
  const id = recordId(new URL(request.url).searchParams.get("id") ?? undefined);
  const data = id ? await documentData(kind, id) : null;
  if (!data) return new Response("İş emri bulunamadı.", { status: 404 });
  const pdf = new Uint8Array(await renderDocument(data));
  return new Response(pdf, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${kinds[kind]}-${data.number}.pdf"`,
    "Cache-Control": "private, no-store",
  } });
}
