"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";
import { ACCENTS, ACCENT_COOKIE } from "@/lib/theme";

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("turuncu");

  useEffect(() => {
    setCurrent(document.documentElement.dataset.accent ?? "turuncu");
  }, []);

  function choose(id: string) {
    document.documentElement.dataset.accent = id;
    document.cookie = `${ACCENT_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    setCurrent(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Renk temasını değiştir"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-ink-700"
      >
        <Palette size={16} /> <span className="hidden lg:inline">Tema rengi</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-ink-600 bg-ink-800 p-2 shadow-xl lg:bottom-full lg:left-0 lg:right-auto lg:mb-2 lg:mt-0">
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.label}
                aria-label={a.label}
                onClick={() => choose(a.id)}
                style={{ backgroundColor: a.color }}
                className={`h-8 w-8 rounded-full ${current === a.id ? "ring-2 ring-white ring-offset-2 ring-offset-ink-800" : ""}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
