"use client";

import { useEffect, useRef, useState } from "react";
import { cardCls } from "./ui";

const toNumber = (v: string | undefined) => { const n = Number((v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };

/** Bobin sayısı ve tel çapı girildikçe değişen basit stator sargı çizimi (yalnız görsel yardım). */
export function WindingPreview() {
  const root = useRef<HTMLElement>(null);
  const [coils, setCoils] = useState(0);
  const [slots, setSlots] = useState(0);
  const [wire, setWire] = useState(0);
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const read = () => {
      const val = (name: string) => form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value;
      setCoils(Math.min(Math.max(Math.trunc(toNumber(val("coilCount"))), 0), 60));
      setSlots(Math.min(Math.max(Math.trunc(toNumber(val("slotCount"))), 0), 72));
      setWire(toNumber(val("wire-0")));
    };
    read();
    form.addEventListener("input", read);
    form.addEventListener("change", read);
    return () => { form.removeEventListener("input", read); form.removeEventListener("change", read); };
  }, []);

  const slotCount = slots || Math.max(coils, 12);
  const stroke = Math.min(Math.max(wire * 3.2, 1.2), 9);
  const arc = coils > 0 ? Math.min((360 / coils) * 0.78, 60) : 0;
  const pt = (deg: number, r: number) => [50 + r * Math.cos((deg * Math.PI) / 180), 50 + r * Math.sin((deg * Math.PI) / 180)] as const;
  return <section ref={root} className={cardCls + " flex flex-wrap items-center gap-4"} aria-label="Sargı görseli">
    <svg viewBox="0 0 100 100" width="150" height="150" role="img" aria-label={`${coils} bobin, ${wire || "?"} mm tel`}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="#52525b" strokeWidth="4" />
      <g className="cb-spin" style={{ transformOrigin: "50px 50px" }}>
        {Array.from({ length: slotCount }, (_, i) => {
          const [x1, y1] = pt((360 / slotCount) * i, 38); const [x2, y2] = pt((360 / slotCount) * i, 44);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#71717a" strokeWidth="1.4" />;
        })}
        {Array.from({ length: coils }, (_, i) => {
          const start = (360 / coils) * i; const [sx, sy] = pt(start, 31); const [ex, ey] = pt(start + arc, 31);
          return <path key={i} d={`M ${sx} ${sy} A 31 31 0 ${arc > 180 ? 1 : 0} 1 ${ex} ${ey}`} fill="none"
            stroke={i % 2 ? "#f59e0b" : "#ea580c"} strokeWidth={stroke} strokeLinecap="round" />;
        })}
      </g>
      <circle cx="50" cy="50" r="14" fill="#27272a" stroke="#52525b" strokeWidth="2" />
    </svg>
    <div className="text-sm">
      <p className="font-semibold">Sargı görseli</p>
      <p className="text-zinc-400">{coils > 0 ? `${coils} bobin` : "Bobin sayısı girilmedi"} · {wire > 0 ? `Ø ${String(wire).replace(".", ",")} mm tel` : "tel çapı seçilmedi"}</p>
      <p className="text-xs text-zinc-500">Kalınlık tel çapına göre çizilir (şematik).</p>
    </div>
  </section>;
}
