"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { btnGhost, btnPrimary, cardCls, inputCls, labelCls } from "@/components/ui";

/** Ucuz etiket yazıcılarının en yaygın kâğıt ölçüleri (genişlik × yükseklik, mm). */
const SIZES = [[30, 20], [40, 30], [50, 30], [50, 70]] as const;
const KEY = "cb-etiket-boyut";

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const out: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    const test = cur ? `${cur} ${word}` : word;
    if (cur && ctx.measureText(test).width > maxWidth) { out.push(cur); cur = word; } else cur = test;
  }
  if (cur) out.push(cur);
  return out;
}

export function LabelPrint({ id, number, lines }: { id: number; number: string; lines: string[] }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState(false);
  const [size, setSize] = useState(1);
  const [note, setNote] = useState("");
  const [w, h] = SIZES[size];
  const tall = h > w * 0.9; // 50×70: QR üstte, yazı altta
  const column = tall || (w < 50 && h >= 30); // dar etiketlerde QR üstte, yazı altta
  const fontMm = w < 50 ? 2.5 : 2.9;
  useEffect(() => { try { const s = Number(localStorage.getItem(KEY)); if (s >= 0 && s < SIZES.length) setSize(s); } catch {} }, []);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(new URL(`/is-emirleri/${id}/bilgi`, window.location.origin).href, { width: 600, margin: 1, errorCorrectionLevel: "M" })
      .then(url => { if (active) setQr(url); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]);

  const qrMm = tall ? w - 6 : column ? 14 : h <= 20 ? 16 : Math.min(h - 4, w * 0.45);
  // Küçük etiketlerde marka satırı atlanır (bilgi kartında zaten var); en çok yer sargı özetine ayrılır.
  const textLines = h <= 20 ? [] : w < 50 && !tall ? lines.slice(1) : lines;

  /** iPhone'da etiket yazıcısı uygulamasına (Phomemo, NIIMBOT, vb.) verilecek resmi üretir (203 dpi ≈ 8 nokta/mm). */
  async function makeImage() {
    const k = 8, W = w * k, H = h * k;
    const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); ctx.fillStyle = "#000"; ctx.textBaseline = "top";
    const img = new Image(); img.src = qr; await img.decode();
    const q = qrMm * k, pad = 2 * k;
    const qx = column ? (W - q) / 2 : pad, qy = column ? pad : (H - q) / 2;
    ctx.drawImage(img, qx, qy, q, q);
    const tx = column ? pad : qx + q + pad, tw = W - tx - pad;
    let ty = column ? qy + q + pad * 0.6 : pad;
    const fs = (px: number) => { ctx.font = `bold ${px}px sans-serif`; };
    const numMm = h <= 20 ? 3.2 : fontMm + 0.9;
    fs(numMm * k);
    ctx.textAlign = column ? "center" : "left";
    const cx = column ? W / 2 : tx;
    if (h <= 20) ctx.fillText(number, cx, (H - numMm * k) / 2);
    else { ctx.fillText(number, cx, ty); ty += numMm * 1.25 * k; }
    ctx.font = `${fontMm * k}px sans-serif`;
    for (const t of textLines) for (const l of wrap(ctx, t, tw)) { if (ty + fontMm * k <= H) { ctx.fillText(l, cx, ty); ty += fontMm * 1.2 * k; } }
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, "image/png"));
    if (!blob) return;
    const file = new File([blob], `etiket-${number}.png`, { type: "image/png" });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); setNote("Etiket paylaşıldı."); return; }
    } catch (e) { if ((e as Error).name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    setNote("Etiket resmi indirildi.");
  }

  return <div className="space-y-4">
    <style>{`@media print { @page { size: ${w}mm ${h}mm; margin: 0; } }`}</style>
    <div className={cardCls + " space-y-3 print:hidden"}>
      <h1 className="text-xl font-bold">Cihaz etiketi</h1>
      <label className="block"><span className={labelCls}>Etiket kâğıdı ölçüsü</span>
        <select className={inputCls} value={size} onChange={e => { const s = Number(e.target.value); setSize(s); try { localStorage.setItem(KEY, String(s)); } catch {} }}>
          {SIZES.map(([a, b], i) => <option key={i} value={i}>{a} × {b} mm{i === 1 ? " (en yaygın)" : ""}</option>)}
        </select></label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={!qr} onClick={makeImage}>Resim olarak paylaş / indir</button>
        <button type="button" className={btnGhost} disabled={!qr} onClick={() => window.print()}>Tarayıcıdan yazdır</button>
      </div>
      <p className="text-sm text-zinc-400">Telefon yazıcısı için “Resim olarak paylaş”ı seçip yazıcının uygulamasında açın. QR, okutan kişiye sargı bilgi kartını açar (giriş gerekir).</p>
      {note && <p role="status" className="text-sm text-accent-400">{note}</p>}
    </div>
    {error && <p role="alert">QR kod hazırlanamadı. Sayfayı yenileyin.</p>}
    <div className="workshop-print-label overflow-hidden rounded bg-white text-black" style={{ width: `${w}mm`, height: `${h}mm`, display: "flex", flexDirection: column ? "column" : "row", alignItems: "center", padding: "2mm", gap: column ? "1mm" : "2mm" }}>
      {/* QR yerelde PNG olarak üretilir. */}
      {qr && <img style={{ width: `${qrMm}mm`, height: `${qrMm}mm`, flex: "none" }} src={qr} alt={`${number} bilgi kartı QR kodu`} />}
      <div style={{ minWidth: 0, lineHeight: 1.15, fontSize: `${fontMm}mm`, textAlign: column ? "center" : "left" }}>
        <p style={{ fontWeight: 700, fontSize: h <= 20 ? "3.2mm" : `${fontMm + 0.9}mm` }}>{number}</p>
        {textLines.map((t, i) => <p key={i} style={{ wordBreak: "break-word" }}>{t}</p>)}
      </div>
    </div>
  </div>;
}
