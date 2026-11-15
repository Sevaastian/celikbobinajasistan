"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Volume2, VolumeX, CheckCircle2 } from "lucide-react";

let context: AudioContext | undefined;
let enabled = false;
const preference = "cb-islem-sesi";

function play() {
  if (!enabled || !context || context.state !== "running") return;
  for (const [index, frequency] of [660, 880].entries()) {
    const start = context.currentTime + index * 0.075;
    const tone = context.createOscillator();
    const gain = context.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(0.07, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
    tone.connect(gain).connect(context.destination);
    tone.start(start);
    tone.stop(start + 0.13);
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
  play();
  window.dispatchEvent(new Event("cb-success"));
}

/** Tek örnek: "Kaydedildi" bildirimini ve ?kaydedildi=1 yönlendirmesini yönetir. */
export function WorkshopFeedback() {
  const pathname = usePathname();
  const saved = useSearchParams().get("kaydedildi");
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
    if (saved !== "1") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("kaydedildi")) return;
    url.searchParams.delete("kaydedildi");
    window.history.replaceState(window.history.state, "", url);
    successFeedback();
  }, [pathname, saved]);
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
    <button type="button" onClick={toggle} aria-pressed={sound} aria-label="İşlem sesi" title="İşlem sesi"
      className={`rounded-lg p-2 text-zinc-300 hover:bg-ink-700 ${className}`}>
      {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
    </button>
  );
}
