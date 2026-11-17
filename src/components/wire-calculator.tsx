"use client";

import { useState } from "react";
import { btnGhost, cardCls, inputCls, labelCls } from "./ui";
import { area, diameterFor, metersFromGrams, voltageChange, wireCombos } from "@/lib/wire-calc";

const parse = (value: string) => { const n = Number(value.replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : null; };
const fmt = (n: number, digits = 2) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);

type Row = { count: string; d: string };

export function WireCalculator() {
  const [rows, setRows] = useState<Row[]>([{ count: "1", d: "0,90" }]);
  const [tol, setTol] = useState("4");
  const [turns, setTurns] = useState(""); const [v1, setV1] = useState("380"); const [v2, setV2] = useState("220"); const [vd, setVd] = useState("0,90");
  const [grams, setGrams] = useState(""); const [gd, setGd] = useState("0,90");

  const total = rows.reduce((sum, r) => { const c = parse(r.count), d = parse(r.d); return sum + (c && d ? c * area(d) : 0); }, 0);
  const single = rows.length === 1 && parse(rows[0].count) === 1 && parse(rows[0].d) ? `${(parse(rows[0].d)!).toFixed(2).replace(".", ",")} mm` : undefined;
  const combos = total > 0 ? wireCombos(total, Number(tol), 10, single) : [];
  const vc = (() => { const t = parse(turns), a = parse(v1), b = parse(v2), d = parse(vd); return t && a && b && d ? voltageChange(t, a, b, d) : null; })();
  const meters = (() => { const g = parse(grams), d = parse(gd); return g && d ? metersFromGrams(g, d) : null; })();
  const setRow = (i: number, patch: Partial<Row>) => setRows(prev => prev.map((r, j) => j === i ? { ...r, ...patch } : r));

  const num = (label: string, value: string, onChange: (v: string) => void) => <label>
    <span className={labelCls}>{label}</span>
    <input className={inputCls} inputMode="decimal" value={value} onChange={e => onChange(e.target.value)} />
  </label>;

  return <div className="space-y-4">
    <section className={cardCls + " space-y-3"}>
      <h2 className="font-semibold">1. Tel bulamadım, ne ile değiştiririm?</h2>
      <p className="text-sm text-zinc-400">Mevcut teli yaz; aynı toplam kesite yakın tel kombinasyonlarını çıkarayım.</p>
      {rows.map((r, i) => <div key={i} className="grid grid-cols-2 gap-3">
        {num("Adet (paralel tel)", r.count, v => setRow(i, { count: v }))}
        {num("Çap (mm)", r.d, v => setRow(i, { d: v }))}
      </div>)}
      <div className="flex flex-wrap gap-2">
        {rows.length < 3 && <button type="button" className={btnGhost} onClick={() => setRows([...rows, { count: "1", d: "" }])}>Başka çaptan tel ekle</button>}
        <label className="flex items-center gap-2 text-sm text-zinc-300">Sapma payı
          <select className={inputCls + " !w-auto"} value={tol} onChange={e => setTol(e.target.value)}>
            <option value="2">±%2</option><option value="4">±%4</option><option value="8">±%8</option>
          </select></label>
      </div>
      {total > 0 && <p className="text-sm">Toplam kesit: <b>{fmt(total, 3)} mm²</b> (tek tel olsa <b>{fmt(diameterFor(total), 3)} mm</b> çap)</p>}
      {combos.length > 0 ? <ul className="divide-y divide-ink-600 rounded-lg border border-ink-600">
        {combos.map(c => <li key={c.label} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
          <span className="font-medium">{c.label}</span>
          <span className="text-xs text-zinc-400">{fmt(c.area, 3)} mm² · {c.diffPercent >= 0 ? "+" : ""}{fmt(c.diffPercent, 1)}%</span>
        </li>)}
      </ul> : total > 0 && <p className="text-sm text-zinc-400">Bu sapma payında standart kombinasyon bulunamadı; payı artırın.</p>}
    </section>

    <section className={cardCls + " space-y-3"}>
      <h2 className="font-semibold">2. Gerilim değişince sipir ve tel</h2>
      <p className="text-sm text-zinc-400">Aynı motoru başka voltaja sararken yaklaşık sipir ve tel çapı (aynı güç varsayımı).</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {num("Mevcut sipir", turns, setTurns)}{num("Mevcut tel (mm)", vd, setVd)}{num("Mevcut volt", v1, setV1)}{num("Yeni volt", v2, setV2)}
      </div>
      {vc && <p className="text-sm">Yeni sipir ≈ <b>{fmt(vc.turns, 1)}</b> · yeni tel ≈ <b>{fmt(vc.diameter, 2)} mm</b> (en yakın standart çapı seçin)</p>}
    </section>

    <section className={cardCls + " space-y-3"}>
      <h2 className="font-semibold">3. Tel gramından metre</h2>
      <div className="grid grid-cols-2 gap-3">{num("Tel ağırlığı (g)", grams, setGrams)}{num("Tel çapı (mm)", gd, setGd)}</div>
      {meters !== null && <p className="text-sm">Yaklaşık <b>{fmt(meters, 1)} m</b> tel (emaye hariç, bakır).</p>}
    </section>

    <p className="text-xs text-zinc-500">Bu hesaplar yaklaşıktır: emaye kalınlığı, oluk doluluğu ve sarım şekli hesaba katılmaz. Son karar ustanındır.</p>
  </div>;
}
