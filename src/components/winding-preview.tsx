"use client";

import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { btnGhost, cardCls } from "./ui";

const toNumber = (v: string | undefined) => { const n = Number((v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const COLORS = [
  { id: "bakir", label: "Bakır", a: "#ea580c", b: "#f59e0b" },
  { id: "mavi", label: "Mavi", a: "#2563eb", b: "#60a5fa" },
  { id: "yesil", label: "Yeşil", a: "#16a34a", b: "#86efac" },
  { id: "mor", label: "Mor", a: "#9333ea", b: "#d8b4fe" },
  { id: "gumus", label: "Gümüş", a: "#a1a1aa", b: "#e4e4e7" },
] as const;
const PREFS = "cb-sargi-gorsel";

type Info = { title: string; lines: string[] };

/** Stator sargı çizimi: renk, kalınlık ve çizimdeki sargı sayısı ayarlanır; PNG olarak paylaşılabilir (kayda yazılmaz). */
export function WindingPreview() {
  const root = useRef<HTMLElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [form, setForm] = useState({ coils: 0, slots: 0, wire: 0 });
  const [color, setColor] = useState<(typeof COLORS)[number]["id"]>("bakir");
  const [thickness, setThickness] = useState(1);
  const [override, setOverride] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(PREFS) ?? "null"); if (saved) { if (COLORS.some(c => c.id === saved.color)) setColor(saved.color); if (saved.thickness >= 0.5 && saved.thickness <= 2) setThickness(saved.thickness); } } catch {}
    const f = root.current?.closest("form");
    if (!f) return;
    const read = () => {
      const val = (name: string) => f.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value;
      setForm({
        coils: Math.min(Math.max(Math.trunc(toNumber(val("coilCount"))), 0), 60),
        slots: Math.min(Math.max(Math.trunc(toNumber(val("slotCount"))), 0), 72),
        wire: toNumber(val("wire-0")),
      });
    };
    read();
    f.addEventListener("input", read); f.addEventListener("change", read);
    return () => { f.removeEventListener("input", read); f.removeEventListener("change", read); };
  }, []);
  useEffect(() => { try { localStorage.setItem(PREFS, JSON.stringify({ color, thickness })); } catch {} }, [color, thickness]);

  const palette = COLORS.find(c => c.id === color)!;
  const coils = override ?? form.coils;
  const slotCount = form.slots || Math.max(coils, 12);
  const stroke = Math.min(Math.max(form.wire * 3.2 * thickness, 1.2), 11);
  const arc = coils > 0 ? Math.min((360 / coils) * 0.78, 60) : 0;
  const pt = (deg: number, r: number) => [50 + r * Math.cos((deg * Math.PI) / 180), 50 + r * Math.sin((deg * Math.PI) / 180)] as const;

  function recordInfo(): Info {
    const f = root.current?.closest("form");
    const val = (name: string) => f?.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)?.value?.trim() ?? "";
    const motor = [val("brand"), val("model")].filter(Boolean).join(" ") || "Motor sargı kaydı";
    const rows: [string, string][] = [["Sipir", val("sipir")], ["Hatve", val("hatve")], ["Kalıp", val("mold")], ["Bobin", coils ? String(coils) : ""], ["Tel", form.wire ? `${String(form.wire).replace(".", ",")} mm` : ""]];
    return { title: motor, lines: rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`) };
  }

  async function share() {
    setStatus("");
    try {
      const el = svg.current; if (!el) return;
      const clone = el.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.setAttribute("width", "800"); clone.setAttribute("height", "800");
      clone.querySelectorAll(".cb-spin").forEach(n => n.removeAttribute("class"));
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
      const img = new Image(); await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error("görsel")); img.src = url; });
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
      const c = canvas.getContext("2d")!;
      c.fillStyle = "#111113"; c.fillRect(0, 0, 1080, 1350);
      c.drawImage(img, 140, 150, 800, 800); URL.revokeObjectURL(url);
      const info = recordInfo();
      c.fillStyle = "#ffffff"; c.font = "bold 56px sans-serif"; c.textAlign = "center"; c.fillText(info.title.slice(0, 28), 540, 100);
      c.font = "40px sans-serif"; c.fillStyle = "#d4d4d8";
      info.lines.slice(0, 5).forEach((line, i) => c.fillText(line, 540, 1030 + i * 56));
      c.font = "28px sans-serif"; c.fillStyle = "#71717a"; c.fillText("ÇELİK BOBİNAJ · Atölye Yönetimi", 540, 1310);
      const blob: Blob = await new Promise((ok, fail) => canvas.toBlob(b => (b ? ok(b) : fail(new Error("png"))), "image/png"));
      const file = new File([blob], "sargi-onizleme.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: info.title }); setStatus("Paylaşıldı."); }
      else {
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sargi-onizleme.png"; a.click();
        window.setTimeout(() => URL.revokeObjectURL(a.href), 2000); setStatus("Görsel indirildi.");
      }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setStatus("Görsel oluşturulamadı.");
    }
  }

  return <section ref={root} className={cardCls + " space-y-4"} aria-label="Sargı görseli">
    <div className="flex flex-wrap items-center gap-4">
      <svg ref={svg} viewBox="0 0 100 100" width="150" height="150" role="img" aria-label={`${coils} bobin, ${form.wire || "?"} mm tel`}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="#52525b" strokeWidth="4" />
        <g className="cb-spin" style={{ transformOrigin: "50px 50px" }}>
          {Array.from({ length: slotCount }, (_, i) => {
            const [x1, y1] = pt((360 / slotCount) * i, 38); const [x2, y2] = pt((360 / slotCount) * i, 44);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#71717a" strokeWidth="1.4" />;
          })}
          {Array.from({ length: coils }, (_, i) => {
            const start = (360 / coils) * i; const [sx, sy] = pt(start, 31); const [ex, ey] = pt(start + arc, 31);
            return <path key={i} d={`M ${sx} ${sy} A 31 31 0 ${arc > 180 ? 1 : 0} 1 ${ex} ${ey}`} fill="none"
              stroke={i % 2 ? palette.b : palette.a} strokeWidth={stroke} strokeLinecap="round" />;
          })}
        </g>
        <circle cx="50" cy="50" r="14" fill="#27272a" stroke="#52525b" strokeWidth="2" />
      </svg>
      <div className="text-sm">
        <p className="font-semibold">Sargı görseli</p>
        <p className="text-zinc-400">{coils > 0 ? `${coils} bobin` : "Bobin sayısı girilmedi"} · {form.wire > 0 ? `Ø ${String(form.wire).replace(".", ",")} mm tel` : "tel çapı seçilmedi"}</p>
        <p className="text-xs text-zinc-500">Şematik çizim; kayda yazılmaz.</p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <span className="mb-1 block text-xs text-zinc-400">Tel rengi</span>
        <div className="flex gap-2">
          {COLORS.map(c => <button key={c.id} type="button" title={c.label} aria-label={c.label} aria-pressed={color === c.id} onClick={() => setColor(c.id)}
            className={`h-8 w-8 rounded-full border-2 ${color === c.id ? "border-white" : "border-transparent"}`} style={{ background: `linear-gradient(135deg, ${c.a} 50%, ${c.b} 50%)` }} />)}
        </div>
      </div>
      <label className="text-xs text-zinc-400">Tel kalınlığı ({thickness.toFixed(1)}×)
        <input type="range" min="0.5" max="2" step="0.1" value={thickness} onChange={e => setThickness(Number(e.target.value))} className="mt-1 block w-full" />
      </label>
      <label className="text-xs text-zinc-400">Çizimdeki sargı sayısı ({override === null ? "formdan" : override})
        <input type="range" min="1" max="60" step="1" value={override ?? (form.coils || 12)} onChange={e => setOverride(Number(e.target.value))} className="mt-1 block w-full" />
        {override !== null && <button type="button" className="mt-1 text-accent-400 underline" onClick={() => setOverride(null)}>Forma geri dön</button>}
      </label>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={share} className={btnGhost}><Share2 size={16} /> Görseli paylaş</button>
      {status && <span role="status" className="text-xs text-zinc-400">{status}</span>}
    </div>
  </section>;
}
