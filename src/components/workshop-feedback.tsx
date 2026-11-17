"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Volume2, VolumeX, CheckCircle2 } from "lucide-react";

let context: AudioContext | undefined;
let enabled = false;
const preference = "cb-islem-sesi";

type Sound = "kaydet" | "basari" | "hata" | "rozet";
// Her ses farklı: kaydet = kısa tık, başarı = yükselen iki nota, hata = alçak iki nota.
const SOUNDS: Record<Sound, { notes: number[]; type: OscillatorType; gap: number; length: number; volume: number }> = {
  kaydet: { notes: [520], type: "triangle", gap: 0, length: 0.06, volume: 0.05 },
  basari: { notes: [660, 880], type: "sine", gap: 0.075, length: 0.12, volume: 0.07 },
  rozet: { notes: [523, 659, 784, 1047], type: "sine", gap: 0.09, length: 0.18, volume: 0.07 },
  hata: { notes: [240, 180], type: "square", gap: 0.12, length: 0.16, volume: 0.04 },
};

function play(kind: Sound = "basari") {
  if (!enabled || !context || context.state !== "running") return;
  const sound = SOUNDS[kind];
  for (const [index, frequency] of sound.notes.entries()) {
    const start = context.currentTime + index * sound.gap;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = sound.type;
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(sound.volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + sound.length);
    tone.connect(gain).connect(context.destination);
    tone.start(start);
    tone.stop(start + sound.length + 0.01);
  }
}

function unlock() {
  if (typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {}
}

export function successFeedback() {
  play("basari");
  window.dispatchEvent(new Event("cb-success"));
}

/** Hata mesajı çıkınca alçak uyarı sesi. */
export function errorFeedback() {
  play("hata");
  window.dispatchEvent(new Event("cb-error"));
}

/** Yeni rozet / gizli sürpriz sesi. */
export function badgeFeedback() { play("rozet"); }

/** Kaydet düğmesine basınca kısa tık sesi. */
export function saveClickFeedback() { play("kaydet"); }

/** Tek örnek: "Kaydedildi" bildirimini ve ?kaydedildi=1 yönlendirmesini yönetir. */
export function WorkshopFeedback() {
  const pathname = usePathname();
  const params = useSearchParams();
  const saved = params.get("kaydedildi");
  const celebrate = params.get("kutlama") === "1";
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>();
  useEffect(() => {
    enabled = localStorage.getItem(preference) === "1";
    function maybeUnlock() { if (enabled) unlock(); }
    function show() {
      window.clearTimeout(timer.current);
      setVisible(true);
      timer.current = window.setTimeout(() => setVisible(false), 2200);
    }
    window.addEventListener("pointerdown", maybeUnlock);
    window.addEventListener("keydown", maybeUnlock);
    window.addEventListener("cb-success", show);
    return () => {
      window.removeEventListener("pointerdown", maybeUnlock);
      window.removeEventListener("keydown", maybeUnlock);
      window.removeEventListener("cb-success", show);
      window.clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (saved !== "1" && !celebrate) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("kaydedildi") && !url.searchParams.has("kutlama")) return;
    url.searchParams.delete("kaydedildi");
    url.searchParams.delete("kutlama");
    window.history.replaceState(window.history.state, "", url);
    if (saved === "1") successFeedback();
  }, [pathname, saved, celebrate]);
  if (!visible) return null;
  return (
    <div role="status" className="cb-feedback fixed right-4 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-ink-900 px-4 py-3 text-sm text-emerald-300 shadow-xl bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6">
      <CheckCircle2 size={17} /> Kaydedildi
    </div>
  );
}

/** İşlem sesi aç/kapa düğmesi: telefonda üst çubukta, masaüstünde yan menüde görünür. */
export function SoundToggle({ className = "" }: { className?: string }) {
  const [sound, setSound] = useState(false);
  useEffect(() => {
    enabled = localStorage.getItem(preference) === "1";
    setSound(enabled);
  }, []);
  function toggle() {
    enabled = !sound;
    if (enabled) unlock();
    localStorage.setItem(preference, enabled ? "1" : "0");
    setSound(enabled);
  }
  return (
    <button type="button" onClick={toggle} aria-pressed={sound} aria-label="İşlem seslerini aç/kapat" title="İşlem sesleri (kaydet, başarı, hata)"
      className={`rounded-lg p-2 text-zinc-300 hover:bg-ink-700 ${className}`}>
      {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
