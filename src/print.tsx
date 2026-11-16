"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { btnPrimary, cardCls } from "@/components/ui";

export function LabelPrint({ id, number, device }: { id: number; number: string; device: string }) {
  const [qr, setQr] = useState("");
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(new URL(`/is-emirleri/${id}`, window.location.origin).href, { width: 280, margin: 4 })
      .then(url => { if (active) setQr(url); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [id]);
  return <div className="space-y-4">
    <div className={cardCls + " flex flex-wrap items-center justify-between gap-3 print:hidden"}>
      <h1 className="text-xl font-bold">Cihaz etiketi</h1>
      <button type="button" className={btnPrimary} disabled={!qr} onClick={() => window.print()}>Etiketi yazdır</button>
    </div>
    {error && <p role="alert">QR kod hazırlanamadı. Sayfayı yenileyin.</p>}
    <div className="workshop-print-label w-[64mm] max-w-full rounded-lg bg-white p-3 text-center text-black">
      <p className="text-xs font-bold">ÇELİK BOBİNAJ</p>
      <p className="text-base font-bold">{number}</p>
      {/* QR is generated locally as a PNG. */}
      {qr && <img className="mx-auto h-[32mm] w-[32mm]" src={qr} alt={`${number} iş emri QR kodu`} />}
      <p className="break-words text-xs">{device}</p>
    </div>
  </div>;
}
