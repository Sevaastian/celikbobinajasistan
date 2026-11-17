"use client";

import { useEffect, useState } from "react";
import { Award } from "lucide-react";
import { badgeFeedback } from "./workshop-feedback";

const KEY = "cb-rozetler";

/** Bu tarayıcıda daha önce görülmeyen yeni bir rozet kazanılmışsa kutlar (ilk açılışta sessizce kaydeder). */
export function BadgeWatcher({ earned }: { earned: string[] }) {
  const [fresh, setFresh] = useState<string | null>(null);
  useEffect(() => {
    let seen: string[] | null = null;
    try { const raw = localStorage.getItem(KEY); seen = raw ? JSON.parse(raw) : null; } catch {}
    try { localStorage.setItem(KEY, JSON.stringify(earned)); } catch {}
    if (!Array.isArray(seen)) return;
    const news = earned.filter(title => !seen!.includes(title));
    if (news.length === 0) return;
    const title = news.join(", ");
    setFresh(title);
    badgeFeedback();
    window.dispatchEvent(new Event("cb-confetti"));
    window.dispatchEvent(new CustomEvent("cb-badge", { detail: title }));
    const timer = window.setTimeout(() => setFresh(null), 6000);
    return () => window.clearTimeout(timer);
  }, [earned]);
  if (!fresh) return null;
  return <div role="status" className="cb-pop flex items-center gap-2 rounded-xl border border-accent-500/50 bg-accent-500/15 px-4 py-3 text-sm font-semibold text-accent-400">
    <Award size={20} /> Yeni rozet kazandın: {fresh}
  </div>;
}
