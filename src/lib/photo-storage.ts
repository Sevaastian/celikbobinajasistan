import "server-only";
import { put, del } from "@vercel/blob";

/**
 * Fotoğraf depolama:
 *  - BLOB_READ_WRITE_TOKEN tanımlıysa Vercel Blob'a yüklenir, veritabanında yalnızca adres tutulur.
 *  - Tanımlı değilse (ya da eski kayıtlarda) fotoğraf veritabanında data URL olarak durur.
 * Fotoğraflar tarayıcıya hiçbir zaman doğrudan Blob adresiyle verilmez; her zaman oturum
 * kontrolü yapan /fotograf/[id] üzerinden sunulur.
 */

export const PHOTO_MAX_BYTES = 4 * 1024 * 1024; // Vercel işlev gövdesi sınırı 4,5 MB

const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export function isBlobUrl(url: string) {
  return BLOB_URL.test(url);
}

export async function storePhoto(bytes: Buffer, mime: string): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return `data:${mime};base64,${bytes.toString("base64")}`;
  }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const blob = await put(`fotograf/${Date.now()}.${ext}`, bytes, {
    access: "public",
    contentType: mime,
    addRandomSuffix: true,
  });
  return blob.url;
}

/** Silinen kayıtların Blob dosyalarını temizler. Hata olursa asıl işlemi bozmaz. */
export async function removeStoredPhotos(urls: string[]) {
  const blobs = urls.filter(isBlobUrl);
  if (blobs.length === 0) return;
  try {
    await del(blobs);
  } catch (error) {
    console.error("Blob fotoğrafları silinemedi", error);
  }
}

/** Kayıtlı adresten fotoğrafın baytlarını ve türünü döndürür. */
export async function loadStoredPhoto(url: string): Promise<{ body: BodyInit; mime: string } | null> {
  const data = url.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (data) return { body: new Uint8Array(Buffer.from(data[2], "base64")), mime: data[1] };
  if (isBlobUrl(url)) {
    const upstream = await fetch(url);
    const mime = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !upstream.body || !/^image\/(jpeg|png|webp)$/.test(mime)) return null;
    return { body: upstream.body, mime };
  }
  return null;
}
