"use client";

import { useState } from "react";
import { SelectField } from "./record-fields";
import { btnGhost, cardCls } from "./ui";
import { wireOptions, wireValue } from "@/lib/wire-sizes";

export function WireFields({ values }: { values: (string | null)[] }) {
  const [count, setCount] = useState(Math.max(1, values.reduce((last, value, index) => value ? index + 1 : last, 0)));
  return <section className={cardCls}>
    <h2 className="mb-3 font-semibold">Kullanılacak teller</h2>
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }, (_, index) => <SelectField key={index} label={`${index + 1}. tel çapı`}
        name={`wire-${index}`} empty="Tel seçin" value={wireValue(values[index])} options={wireOptions(values[index])} />)}
    </div>
    {count < 10 && <button type="button" className={btnGhost + " mt-3"} onClick={() => setCount(count + 1)}>Tel ekle</button>}
  </section>;
}
