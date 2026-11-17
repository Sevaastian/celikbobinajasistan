"use client";

import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { inputCls, labelCls, btnGhost } from "./ui";
import { findSimilar } from "@/app/(uygulama)/is-emirleri/similar-actions";
import { SimilarWindingsView } from "./similar-windings";
import type { SimilarItem } from "@/lib/similar";
import { parsePlateText } from "@/lib/plate-text";

type Plate = { brand: string; model: string; serialNo: string; plateKw: string; plateVolt: string; plateRpm: string; platePoles: string };
const MAX_EDGE = 1568;
const TESSERACT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
// Test/özel kurulum için: dosyalar kendi sunucunuzdan servis edilecekse NEXT_PUBLIC_OCR_BASE verilir.
const OCR_BASE = process.env.NEXT_PUBLIC_OCR_BASE;

type TesseractApi = { recognize: (image: Blob, lang: string, options?: Record<string, unknown>) => Promise<{ data: { text: string } }> };
let tesseractPromise: Promise<TesseractApi> | null = null;
function loadTesseract(): Promise<TesseractApi> {
  const w = window as unknown as { Tesseract?: TesseractApi };
  if (w.Tesseract) return Promise.resolve(w.Tesseract);
  tesseractPromise ??= new Promise<TesseractApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = OCR_BASE ? `${OCR_BASE}/tesseract.min.js` : TESSERACT_URL;
    script.onload = () => w.Tesseract ? resolve(w.Tesseract) : reject(new Error("ocr"));
    script.onerror = () => { tesseractPromise = null; reject(new Error("ocr")); };
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

/** OCR için: büyük kenar 2000 px, gri tonlama ve kontrast artırma (metal plakada okunurluğu artırır). */
async function prepareForOcr(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.6)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("resim");
  return blob;
}

/** Fotoğrafı küçültüp JPEG yapar (hızlı yükleme + düşük maliyet). */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("resim");
  return blob;
}

/** Kabulde motor plakası: marka/model/seri/kW/volt/devir/kutup + fotoğraftan doldurma + benzer motor önerisi. */
export function PlateFields({ initial, ocr, showSimilar = true }: {
  initial?: Partial<Record<keyof Plate, string | number | null>>; ocr: "claude" | "free" | false; showSimilar?: boolean;
}) {
  const start = (key: keyof Plate) => initial?.[key] == null ? "" : String(initial[key]);
  const [v, setV] = useState<Plate>({
    brand: start("brand"), model: start("model"), serialNo: start("serialNo"), plateKw: start("plateKw"),
    plateVolt: start("plateVolt"), plateRpm: start("plateRpm"), platePoles: start("platePoles"),
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState<SimilarItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (key: keyof Plate) => (event: React.ChangeEvent<HTMLInputElement>) => setV(prev => ({ ...prev, [key]: event.target.value }));

  useEffect(() => {
    if (!showSimilar || !v.plateKw.trim()) { setSimilar([]); return; }
    let active = true;
    const timer = setTimeout(() => {
      findSimilar({ kw: v.plateKw, rpm: v.plateRpm, poles: v.platePoles, brand: v.brand })
        .then(items => { if (active) setSimilar(items); }).catch(() => { if (active) setSimilar([]); });
    }, 600);
    return () => { active = false; clearTimeout(timer); };
  }, [v.plateKw, v.plateRpm, v.platePoles, v.brand, showSimilar]);

  async function scan(file: File | undefined) {
    if (!file) return;
    setBusy(true); setNote(ocr === "free" ? "Plaka okunuyor… (ilk seferde 10-20 saniye sürebilir)" : "Plaka okunuyor…");
    try {
      if (ocr === "free") {
        const tesseract = await loadTesseract();
        const options = OCR_BASE ? { workerPath: `${OCR_BASE}/worker.min.js`, corePath: OCR_BASE, langPath: `${OCR_BASE}/lang` } : {};
        const { data } = await tesseract.recognize(await prepareForOcr(file), "eng", options);
        const guess = parsePlateText(data.text);
        const found = Object.values(guess).filter(Boolean).length;
        if (!found) { setNote("Plakadan değer okunamadı. Daha yakından, ışık yansımasız çekin ya da elle yazın."); return; }
        setV(prev => ({
          brand: guess.brand ?? prev.brand, model: guess.model ?? prev.model, serialNo: guess.serialNo ?? prev.serialNo,
          plateKw: guess.kw ?? prev.plateKw, plateVolt: guess.volt ?? prev.plateVolt,
          plateRpm: guess.rpm ?? prev.plateRpm, platePoles: guess.poles ?? prev.platePoles,
        }));
        setNote(`Plakadan ${found} değer okundu. Ücretsiz okuma hata yapabilir, lütfen hepsini kontrol edin.`);
        return;
      }
      const form = new FormData();
      form.set("foto", await shrink(file), "plaka.jpg");
      const response = await fetch("/api/plaka", { method: "POST", body: form });
      const body = await response.json().catch(() => ({})) as { ok?: boolean; error?: string; data?: Record<string, string | number | null> };
      if (!response.ok || !body.data) { setNote(body.error ?? "Plaka okunamadı. Elle yazabilirsiniz."); return; }
      const d = body.data; const str = (x: unknown) => x == null ? null : String(x);
      setV(prev => ({
        brand: str(d.brand) ?? prev.brand, model: str(d.model) ?? prev.model, serialNo: str(d.serialNo) ?? prev.serialNo,
        plateKw: str(d.kw) ?? prev.plateKw, plateVolt: str(d.volt) ?? prev.plateVolt,
        plateRpm: str(d.rpm) ?? prev.plateRpm, platePoles: str(d.poles) ?? prev.platePoles,
      }));
      setNote("Plakadan okundu. Lütfen değerleri kontrol edin.");
    } catch { setNote(ocr === "free" ? "Okuma aracı yüklenemedi (internet gerekir). Elle yazabilirsiniz." : "Fotoğraf işlenemedi. Elle yazabilirsiniz."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const input = (key: keyof Plate, label: string, mode?: "numeric" | "decimal") => <label>
    <span className={labelCls}>{label}</span>
    <input name={key} value={v[key]} onChange={set(key)} className={inputCls} inputMode={mode} maxLength={300} />
  </label>;

  return <div className="space-y-3 sm:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Motor plakası</h2>
      {ocr && <>
        <button type="button" className={btnGhost} disabled={busy} onClick={() => fileRef.current?.click()}><Camera size={17} /> Plakayı fotoğrafla</button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={e => scan(e.target.files?.[0])} />
      </>}
    </div>
    {note && <p role="status" className="text-sm text-accent-400">{note}</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      {input("brand", "Marka")}{input("model", "Model")}{input("serialNo", "Seri numarası")}
      {input("plateKw", "Güç (kW)", "decimal")}{input("plateVolt", "Volt")}
      {input("plateRpm", "Devir (RPM)", "numeric")}{input("platePoles", "Kutup sayısı", "numeric")}
    </div>
    {showSimilar && <SimilarWindingsView items={similar} />}
  </div>;
}
