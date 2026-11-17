"use client";

import { useEffect, useRef, useState } from "react";
import { MascotFace, type Mood } from "./mascot-face";
import { badgeFeedback } from "./workshop-feedback";

type Slice = { kind: "espri" | "gorev" | "maskot"; label: string; color: string };
const SLICES: Slice[] = [
  { kind: "espri", label: "Espri", color: "#f59e0b" }, { kind: "gorev", label: "Görev", color: "#10b981" },
  { kind: "maskot", label: "Maskot", color: "#8b5cf6" }, { kind: "espri", label: "Espri", color: "#ec4899" },
  { kind: "gorev", label: "Görev", color: "#3b82f6" }, { kind: "maskot", label: "Maskot", color: "#14b8a6" },
];
const JOKES = [
  "Motor ustaya demiş ki: 'Beni sarma, sadece dinle.'",
  "Bobinin derdi ne? Hep dönüp durması.",
  "Tel çapını yanlış seçen, ömür boyu sipir sayar.",
  "Elektrikçi lamba gibidir: bir şey olmadan parlamaz.",
  "Kalıp kaybolunca usta kalıp gibi donar.",
  "Rulman gıcırdayınca motor değil, usta ağlar.",
  "Sarım doğruysa motor da 'tamam usta' der.",
  "Çay soğuyunca iş de soğur, ikisini de sıcak tut.",
];
const TASKS = [
  "Mini görev: Bugün eksik bilgili 1 bobinaj kaydını tamamla (❗ olanlara bak).",
  "Mini görev: Teslime hazır bir işin müşterisine WhatsApp'tan haber ver.",
  "Mini görev: Tel stoğuna bir göz at, kritik olan var mı?",
  "Mini görev: Bir eski motorun kalıp bilgisini kayda ekle.",
  "Mini görev: Bugünkü tahsilatları kontrol et.",
  "Mini görev: Fotoğrafsız bir kayda sökülmüş motor fotoğrafı ekle.",
];
const REACTIONS: { mood: Mood; text: string }[] = [
  { mood: "kutlama", text: "Bugün şanslı günündeyiz usta! Her iş tam isabet." },
  { mood: "dusunceli", text: "Hmm... Bence bugün sipir sayarken telefona bakmamak lazım." },
  { mood: "saskin", text: "Vay! Çark bile şaşırdı, bu gün güzel geçecek." },
  { mood: "uykulu", text: "Zzz... Çay getir, motor beklesin." },
  { mood: "mutlu", text: "Enerji tam! Motorlar sana güveniyor." },
];
const KEY = "cb-cark";
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

type Result = { day: string; kind: Slice["kind"]; text: string; mood?: Mood };

/** Atölye çarkı: çevirince günün espri, mini görev veya maskot tepkisini seçer. */
export function WorkshopWheel() {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const timer = useRef<number>();
  const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); const saved = raw ? JSON.parse(raw) as Result : null; if (saved?.day === today) setResult(saved); } catch {}
    return () => window.clearTimeout(timer.current);
  }, [today]);

  function spin() {
    if (spinning) return;
    const index = Math.floor(Math.random() * SLICES.length);
    const sliceAngle = 360 / SLICES.length;
    // İşaretçi üstte; seçilen dilimin ortası üste gelsin.
    const target = 360 * 5 + (360 - (index * sliceAngle + sliceAngle / 2));
    setSpinning(true);
    setAngle(prev => prev - (prev % 360) + target);
    timer.current = window.setTimeout(() => {
      const slice = SLICES[index];
      const next: Result = slice.kind === "espri" ? { day: today, kind: "espri", text: pick(JOKES) }
        : slice.kind === "gorev" ? { day: today, kind: "gorev", text: pick(TASKS) }
        : (() => { const r = pick(REACTIONS); return { day: today, kind: "maskot" as const, text: r.text, mood: r.mood }; })();
      setResult(next); setSpinning(false);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      badgeFeedback();
      if (slice.kind === "maskot") window.dispatchEvent(new CustomEvent("cb-egg", { detail: next.text }));
    }, 3200);
  }

  const r = 46, slice = 360 / SLICES.length;
  const point = (deg: number, radius: number) => [50 + radius * Math.sin((deg * Math.PI) / 180), 50 - radius * Math.cos((deg * Math.PI) / 180)] as const;
  return <section className="flex flex-wrap items-center gap-4 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-label="Atölye çarkı">
    <div className="relative shrink-0">
      <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-xl leading-none text-accent-400" aria-hidden>▼</div>
      <svg viewBox="0 0 100 100" width="132" height="132" role="img" aria-label="Atölye çarkı"
        style={{ transform: `rotate(${angle}deg)`, transition: spinning ? "transform 3.1s cubic-bezier(.15,.7,.1,1)" : "none" }}>
        {SLICES.map((s, i) => {
          const [x1, y1] = point(i * slice, r); const [x2, y2] = point((i + 1) * slice, r); const [tx, ty] = point(i * slice + slice / 2, 30);
          return <g key={i}>
            <path d={`M50 50 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}Z`} fill={s.color} stroke="#18181b" strokeWidth="1" />
            <text x={tx} y={ty} fontSize="7" fill="#fff" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${i * slice + slice / 2} ${tx} ${ty})`}>{s.label}</text>
          </g>;
        })}
        <circle cx="50" cy="50" r="6" fill="#18181b" />
      </svg>
    </div>
    <div className="min-w-0 flex-1 space-y-2">
      <h2 className="font-semibold">Atölye çarkı</h2>
      {result
        ? <div className="cb-pop flex items-start gap-2 text-sm">{result.kind === "maskot" && <MascotFace mood={result.mood} size={40} className="shrink-0" />}<p>{result.text}</p></div>
        : <p className="text-sm text-zinc-400">Günün esprisi, mini görevi ya da maskotun tepkisi için çevir.</p>}
      <button type="button" onClick={spin} disabled={spinning}
        className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
        {spinning ? "Dönüyor..." : result ? "Tekrar çevir" : "Çarkı çevir"}
      </button>
    </div>
  </section>;
}
