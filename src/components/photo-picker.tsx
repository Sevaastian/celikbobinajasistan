"use client";

import { useRef, useState } from "react";
import { inputCls, labelCls } from "./ui";

const MAX_SIDE = 1600; // piksel
const QUALITY = 0.82;

function kb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Fotoğrafı telefonda küçültür (en uzun kenar 1600 px, JPEG). Başarısız olursa orijinali yollar. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // şeffaf PNG'lerde siyah zemin oluşmasın
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export function PhotoPicker() {
  const input = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    if (!original) return setInfo(null);
    setInfo("Fotoğraf küçültülüyor...");
    const result = await shrink(original);
    if (result !== original && input.current) {
      const transfer = new DataTransfer();
      transfer.items.add(result);
      input.current.files = transfer.files;
    }
    setInfo(result === original ? `Boyut: ${kb(original.size)}` : `Küçültüldü: ${kb(original.size)} → ${kb(result.size)}`);
  }

  return (
    <label className="sm:col-span-2">
      <span className={labelCls}>Fotoğraf (telefonda otomatik küçültülür)</span>
      <input ref={input} className={inputCls} name="photo" type="file" accept="image/jpeg,image/png,image/webp" required onChange={onChange} />
      {info && <span className="mt-1 block text-xs text-zinc-400">{info}</span>}
    </label>
  );
}
