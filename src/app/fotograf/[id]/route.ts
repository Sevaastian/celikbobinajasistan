import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getSession } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { loadStoredPhoto } from "@/lib/photo-storage";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!await getSession()) return new Response(null, { status: 401 });
  const id = recordId(params.id);
  if (!id) return new Response(null, { status: 404 });
  const { photos } = schema;
  const [photo] = await getDb().select({ url: photos.url }).from(photos).where(eq(photos.id, id));
  if (!photo) return new Response(null, { status: 404 });
  const file = await loadStoredPhoto(photo.url);
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.body, {
    headers: {
      "Content-Type": file.mime,
      // Fotoğraf içeriği hiç değişmez; telefonda tekrar indirilmesin
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
