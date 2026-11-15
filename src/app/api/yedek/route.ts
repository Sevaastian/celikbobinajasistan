import { getDb } from "@/db";
import { getSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { createBackupStream, type BackupDb } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Yalnızca yönetici. ?fotograf=1 ile veritabanındaki fotoğraf içerikleri de dahil edilir. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "yonetici") return new Response("Bu işlem için yetkiniz yok.", { status: 403 });

  const withPhotos = new URL(request.url).searchParams.get("fotograf") === "1";
  await logActivity(session.uid, "yedek_indir", "veritabani", null, { fotografIcerigi: withPhotos });

  const date = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());
  const stream = createBackupStream(getDb() as unknown as BackupDb, { withPhotos });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Content-Disposition": `attachment; filename="celik-bobinaj-yedek-${date}${withPhotos ? "-fotografli" : ""}.ndjson"`,
      "Cache-Control": "no-store",
    },
  });
}
