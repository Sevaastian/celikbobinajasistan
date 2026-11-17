"use client";

import { useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";

const CHECKS: [string, string, boolean][] = [
  ["sipir", "Sipir", false], ["hatve", "Hatve", false], ["wire-0", "Tel çapı", false],
  ["auxSipir", "Yardımcı sipir", true], ["auxHatve", "Yardımcı hatve", true], ["aux-wire-0", "Yardımcı tel çapı", true],
];

/** Sipir, hatve ve tel çapı boşsa kırmızı ünlemle uyarır; alanları da kırmızı çerçeveler. Kaydı engellemez. */
export function WindingWarning() {
  const root = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState<string[]>([]);
  useEffect(() => {
    const form = root.current?.closest("form");
    if (!form) return;
    const run = () => {
      const lacking: string[] = [];
      for (const [name, label, onlyIfPresent] of CHECKS) {
        const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`);
        if (!el && onlyIfPresent) continue; // yardımcı alanlar yalnızca monofazede var
        const empty = !el || el.value.trim() === "";
        el?.toggleAttribute("data-eksik", empty);
        if (empty) lacking.push(label);
      }
      setMissing(lacking);
    };
    run();
    form.addEventListener("input", run);
    form.addEventListener("change", run);
    // Faz değişince yardımcı bobin alanları sonradan eklenir/kalkar; onları da izle.
    const observer = new MutationObserver(run);
    observer.observe(form, { childList: true, subtree: true });
    return () => { observer.disconnect(); form.removeEventListener("input", run); form.removeEventListener("change", run); };
  }, []);
  return <div ref={root} aria-live="polite">
    {missing.length > 0 && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">
      <TriangleAlert size={20} className="mt-0.5 shrink-0 text-red-400" aria-hidden />
      <span><b>❗ Eksik bilgi:</b> {missing.join(", ")} girilmedi. Kaydedebilirsiniz ama bu değerler sonraki işlerde en çok lazım olur.</span>
    </p>}
  </div>;
}
