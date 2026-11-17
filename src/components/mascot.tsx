"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Smile } from "lucide-react";
import { MascotFace, type Mood } from "./mascot-face";
import { badgeFeedback } from "./workshop-feedback";

const PREF = "cb-maskot";

type Reaction = { mood: Mood; text: string };

function pageReaction(path: string): Reaction {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  if (hour < 5) return { mood: "uykulu", text: "Bu saatte hâlâ atölyede mi? Bir çay molası ver." };
  if (path === "/") return day === 5
    ? { mood: "kutlama", text: "Cuma! Haftayı temiz bir defterle kapat." }
    : { mood: "mutlu", text: hour < 12 ? "Günaydın usta! Bugün hangi motor bizi bekliyor?" : "Merhaba! Bugünkü işler nasıl gidiyor?" };
  if (path.startsWith("/is-emirleri/kabul")) return { mood: "mutlu", text: "Yeni cihaz geldi! Şikâyeti iyi yaz, sonra işimiz kolay." };
  if (path.startsWith("/is-emirleri")) return { mood: "mutlu", text: "Teslim edilen her iş bir adım rozet demek!" };
  if (path.startsWith("/bobinaj")) return { mood: "dusunceli", text: "Sipir, hatve, tel çapı ve kalıp... Eksik bırakma, ileride lazım olur." };
  if (path.startsWith("/musteriler")) return { mood: "mutlu", text: "Müşterisini hatırlayan atölye büyür." };
  if (path.startsWith("/stok")) return { mood: "dusunceli", text: "Tel stoğuna bir göz at; en kalın çap bitmesin." };
  if (path.startsWith("/finans")) return { mood: "dusunceli", text: "Rakamlar yalan söylemez. Tahsilatları kontrol et." };
  if (path.startsWith("/raporlar")) return { mood: "mutlu", text: "Rapor hazır; dosyayı arşivle." };
  if (path.startsWith("/arama")) return { mood: "saskin", text: "Aradığın kayıt mutlaka bir yerlerde!" };
  if (path.startsWith("/yedek")) return { mood: "saskin", text: "Yedek aldın mı? Bir tanesi yetmez, bir de telefona kaydet." };
  return { mood: "mutlu", text: "Ben buradayım usta, bir şey lazım olursa dokun." };
}

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Sağ altta duran maskot: sayfaya ve olaylara göre poz ve mesaj değiştirir. Gizli sürprizler de burada. */
export function FloatingMascot() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(true);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [open, setOpen] = useState(false);
  const [spin, setSpin] = useState(false);
  const taps = useRef({ n: 0, at: 0 });
  const timer = useRef<number>();
  const konami = useRef(0);

  const say = (next: Reaction, ms = 4500) => {
    setReaction(next); setOpen(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(false), ms);
  };

  useEffect(() => {
    const read = () => setHidden((() => { try { return localStorage.getItem(PREF) === "0"; } catch { return false; } })());
    read();
    window.addEventListener("cb-maskot-ayar", read);
    return () => window.removeEventListener("cb-maskot-ayar", read);
  }, []);

  useEffect(() => { if (!hidden) say(pageReaction(pathname), 4000); }, [pathname, hidden]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onSuccess = () => say({ mood: "kutlama", text: "Süper, kaydedildi!" }, 2800);
    const onError = () => say({ mood: "saskin", text: "Hmm, bir şeyler eksik ya da hatalı. Kırmızı yazıya bak." }, 5000);
    const onBadge = (e: Event) => say({ mood: "kutlama", text: `Yeni rozet: ${(e as CustomEvent<string>).detail ?? ""}! Tebrikler usta!` }, 6000);
    const onEgg = (e: Event) => say({ mood: "kutlama", text: (e as CustomEvent<string>).detail || "Gizli sürpriz bulundu!" }, 6000);
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konami.current = key === KONAMI[konami.current] ? konami.current + 1 : key === KONAMI[0] ? 1 : 0;
      if (konami.current === KONAMI.length) {
        konami.current = 0;
        window.dispatchEvent(new Event("cb-confetti")); badgeFeedback();
        document.documentElement.classList.add("cb-disco");
        window.setTimeout(() => document.documentElement.classList.remove("cb-disco"), 6000);
        say({ mood: "kutlama", text: "Gizli kod çözüldü! Atölye diskoya döndü." }, 6000);
      }
    };
    window.addEventListener("cb-success", onSuccess);
    window.addEventListener("cb-error", onError);
    window.addEventListener("cb-badge", onBadge);
    window.addEventListener("cb-egg", onEgg);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("cb-success", onSuccess); window.removeEventListener("cb-error", onError);
      window.removeEventListener("cb-badge", onBadge); window.removeEventListener("cb-egg", onEgg);
      window.removeEventListener("keydown", onKey); window.clearTimeout(timer.current);
    };
  }, []);

  function tap() {
    const now = Date.now();
    taps.current = now - taps.current.at < 1500 ? { n: taps.current.n + 1, at: now } : { n: 1, at: now };
    if (taps.current.n >= 5) {
      taps.current.n = 0;
      setSpin(true); window.setTimeout(() => setSpin(false), 1200);
      window.dispatchEvent(new Event("cb-confetti")); badgeFeedback();
      say({ mood: "kutlama", text: "Başım döndü! Gizli sürprizi buldun usta." }, 5000);
      return;
    }
    if (open) setOpen(false); else say(pageReaction(pathname), 5000);
  }

  if (hidden) return null;
  return <div className="pointer-events-none fixed left-3 z-30 flex items-end gap-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6 lg:left-auto lg:right-6 lg:flex-row-reverse"
    style={{ marginLeft: "env(safe-area-inset-left)" }}>
    <button type="button" onClick={tap} aria-label="Maskot" title="Maskot"
      className={`pointer-events-auto rounded-full border border-ink-600 bg-ink-800/95 p-1 shadow-lg ${spin ? "cb-spin-once" : ""}`}>
      <MascotFace mood={reaction?.mood ?? "mutlu"} size={44} />
    </button>
    {open && reaction && <p role="status" className="cb-feedback pointer-events-none max-w-[14rem] rounded-xl border border-ink-600 bg-ink-900/95 px-3 py-2 text-xs text-zinc-100 shadow-xl">
      {reaction.text}
    </p>}
  </div>;
}

/** Maskotu göster/gizle düğmesi (üst çubuk ve yan menü). */
export function MascotToggle({ className = "" }: { className?: string }) {
  const [on, setOn] = useState(true);
  useEffect(() => { try { setOn(localStorage.getItem(PREF) !== "0"); } catch {} }, []);
  function toggle() {
    const next = !on; setOn(next);
    try { localStorage.setItem(PREF, next ? "1" : "0"); } catch {}
    window.dispatchEvent(new Event("cb-maskot-ayar"));
  }
  return <button type="button" onClick={toggle} aria-pressed={on} aria-label="Maskotu göster veya gizle" title="Maskot"
    className={`rounded-lg p-2 hover:bg-ink-700 ${on ? "text-accent-400" : "text-zinc-500"} ${className}`}><Smile size={18} /></button>;
}
