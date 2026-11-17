"use client";

import { useState } from "react";
import { btnGhost, cardCls, inputCls, labelCls } from "./ui";
import { isMonophase } from "@/lib/winding-check";
import { wireOptions, wireValue } from "@/lib/wire-sizes";

const PHASES = ["Trifaze", "Monofaze"];

/** Faz seçimi. Monofaze seçilince yardımcı bobin için ayrı sipir / hatve / tel çapı alanları açılır. */
export function PhaseWindings({ phase, auxSipir, auxHatve, auxWires }: {
  phase?: string | null; auxSipir?: string | null; auxHatve?: string | null; auxWires?: (string | null)[] | null;
}) {
  const initial = phase ?? "";
  const [value, setValue] = useState(isMonophase(initial) ? "Monofaze" : initial);
  const wires = auxWires ?? [];
  const [count, setCount] = useState(Math.max(1, wires.reduce((last, v, i) => v ? i + 1 : last, 0)));
  const mono = isMonophase(value);
  const options = value && !PHASES.includes(value) ? [...PHASES, value] : PHASES;
  return <>
    <section className={cardCls}>
      <label>
        <span className={labelCls}>Faz</span>
        <select name="phase" value={value} onChange={event => setValue(event.target.value)} className={inputCls}>
          <option value="">Faz seçin</option>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
      {mono && <p className="mt-2 text-sm text-zinc-300">Monofaze: aşağıdaki <b>Sipir, Hatve ve Kullanılacak teller ANA bobine</b> aittir. Yardımcı bobini ayrıca girin.</p>}
    </section>
    {mono && <section className={cardCls + " border-accent-400/40"}>
      <h2 className="mb-3 font-semibold">Yardımcı bobin</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className={labelCls}>Yardımcı sipir</span>
          <input name="auxSipir" defaultValue={auxSipir ?? ""} className={inputCls} maxLength={300} /></label>
        <label><span className={labelCls}>Yardımcı hatve</span>
          <input name="auxHatve" defaultValue={auxHatve ?? ""} className={inputCls} maxLength={300} /></label>
        {Array.from({ length: count }, (_, index) => <label key={index}>
          <span className={labelCls}>Yardımcı {index + 1}. tel çapı</span>
          <select name={`aux-wire-${index}`} defaultValue={wireValue(wires[index])} className={inputCls}>
            <option value="">Tel seçin</option>
            {wireOptions(wires[index]).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
          </select>
        </label>)}
      </div>
      {count < 10 && <button type="button" className={btnGhost + " mt-3"} onClick={() => setCount(count + 1)}>Yardımcı tel ekle</button>}
    </section>}
  </>;
}
