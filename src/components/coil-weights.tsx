"use client";

import { useEffect, useRef, useState } from "react";
import { cardCls, inputCls, labelCls } from "./ui";
import { formatGrams, formatKilos, sumGrams } from "@/lib/coil-weights";

const MAX = 100;
const toNumber = (v: string) => { const n = Number(v.replace(",", ".")); return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : 0; };

/** Bobin sayısı kadar gram kutusu açar; yazdıkça toplam gram ve kiloyu gösterir. */
export function CoilWeights({ values, initialCount }: { values: string[]; initialCount: number | null }) {
  const root = useRef<HTMLElement>(null);
  const [count, setCount] = useState(initialCount ?? 0);
  const [grams, setGrams] = useState<string[]>(values.map(v => v.replace(".", ",")));
  const [all, setAll] = useState("");

  // Formdaki "Bobin sayısı" kutusunu dinle.
  useEffect(() => {
    const form = root.current?.closest("form");
    const input = form?.querySelector<HTMLInputElement>('input[name="coilCount"]');
    if (!input) return;
    const read = () => { const n = parseInt(input.value, 10); setCount(Number.isFinite(n) && n > 0 ? Math.min(n, MAX) : 0); };
    read();
    input.addEventListener("input", read);
    return () => input.removeEventListener("input", read);
  }, []);

  const shown = Math.max(count, grams.filter(Boolean).length);
  const total = sumGrams(grams.slice(0, shown).map(toNumber));
  const filled = grams.slice(0, shown).filter(g => g.trim() !== "").length;
  const set = (i: number, v: string) => setGrams(prev => { const next = [...prev]; while (next.length <= i) next.push(""); next[i] = v; return next; });
  const fillAll = (v: string) => { setAll(v); setGrams(Array.from({ length: shown }, () => v)); };

  return <section ref={root} className={cardCls}>
    <h2 className="mb-1 font-semibold">Bobin ağırlıkları</h2>
    <p className="mb-3 text-xs text-zinc-400">Yukarıdaki "Bobin sayısı" kadar kutu açılır. Her bobini tartıp gramını yazın; toplam otomatik hesaplanır.</p>
    {shown === 0 ? <p className="text-sm text-zinc-400">Önce "Bobin sayısı" alanına bir sayı yazın.</p> : <>
      <div className="mb-3 sm:max-w-xs">
        <label className={labelCls} htmlFor="coil-all">Hepsi aynı gramsa (isteğe bağlı)</label>
        <input id="coil-all" className={inputCls} inputMode="decimal" placeholder="örn. 125,5" value={all} onChange={e => fillAll(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: shown }, (_, i) => <div key={i}>
          <label className={labelCls} htmlFor={`coil-${i}`}>{i + 1}. bobin (g)</label>
          <input id={`coil-${i}`} name={`coilGram-${i}`} className={inputCls} inputMode="decimal" autoComplete="off"
            value={grams[i] ?? ""} onChange={e => set(i, e.target.value)} />
        </div>)}
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg bg-ink-900 p-3" aria-live="polite">
        <span className="text-sm text-zinc-400">{filled}/{shown} bobin tartıldı</span>
        <span className="text-lg font-bold">{formatGrams(total)}</span>
        <span className="text-lg font-bold text-accent-400">{formatKilos(total)}</span>
      </div>
    </>}
  </section>;
}
