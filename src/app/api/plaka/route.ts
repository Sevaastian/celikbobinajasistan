import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROMPT = `Bu bir elektrik motoru (veya alternatör/pompa) plaka fotoğrafı. Plakadaki değerleri oku ve SADECE tek bir JSON nesnesi döndür, başka hiçbir metin yazma.
Alanlar (okunamayan veya plakada olmayanlar için null yaz, tahmin etme):
{"brand": string|null, "model": string|null, "serialNo": string|null, "kw": number|null, "hp": number|null, "volt": string|null, "rpm": number|null, "poles": number|null, "phase": "1"|"3"|null, "frequency": number|null}
volt: plakadaki değer, örn "380" veya "220/380". rpm: devir/dakika. kW ve HP ayrı alanlardır, hangisi yazıyorsa onu doldur.`;

const text = (value: unknown, max = 100) => typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : (typeof value === "string" && /^\d+([.,]\d+)?$/.test(value.trim()) ? Number(value.replace(",", ".")) : null);

/** Plaka fotoğrafını Claude ile okur. Anahtar tanımlı değilse 501 döner. Sonuç kullanıcı onayına sunulur, kaydedilmez. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Oturum bulunamadı." }, { status: 401 });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "Plaka okuma kapalı (ANTHROPIC_API_KEY tanımlı değil)." }, { status: 501 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("foto");
  if (!(file instanceof File) || !/^image\/(jpeg|png|webp)$/.test(file.type)) return Response.json({ error: "Geçerli bir fotoğraf seçin." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return Response.json({ error: "Fotoğraf çok büyük." }, { status: 413 });

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  try {
    const response = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5",
        max_tokens: 400,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: file.type, data } },
          { type: "text", text: PROMPT },
        ] }],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) {
      console.error("Plaka okuma hatası", response.status, (await response.text()).slice(0, 300));
      return Response.json({ error: "Plaka okunamadı. Birazdan tekrar deneyin ya da elle yazın." }, { status: 502 });
    }
    const body = await response.json() as { content?: { type: string; text?: string }[] };
    const raw = body.content?.find(part => part.type === "text")?.text ?? "";
    const json = raw.match(/\{[\s\S]*\}/)?.[0];
    const parsed = json ? JSON.parse(json) as Record<string, unknown> : null;
    if (!parsed) return Response.json({ error: "Plakadan değer okunamadı. Daha net bir fotoğraf deneyin." }, { status: 422 });
    const hp = num(parsed.hp);
    const kw = num(parsed.kw) ?? (hp ? Math.round(hp * 0.7355 * 100) / 100 : null);
    const result = {
      brand: text(parsed.brand), model: text(parsed.model), serialNo: text(parsed.serialNo),
      kw, volt: text(parsed.volt, 50), rpm: num(parsed.rpm) ? Math.round(num(parsed.rpm)!) : null,
      poles: num(parsed.poles) ? Math.round(num(parsed.poles)!) : null, phase: text(parsed.phase, 5),
    };
    await logActivity(session.uid, "plaka_oku", "is_emri", null, { okundu: Object.values(result).filter(v => v !== null).length });
    return Response.json({ ok: true, data: result });
  } catch (error) {
    console.error("Plaka okuma başarısız", error);
    return Response.json({ error: "Plaka okunamadı. Elle yazabilirsiniz." }, { status: 502 });
  }
}
