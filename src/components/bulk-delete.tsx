"use client";

import { useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { bulkDelete, type BulkResult } from "@/app/toplu-sil";
import { btnGhost } from "./ui";

function DeleteButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded-lg bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
    {pending ? "Siliniyor..." : "Seçilenleri sil"}</button>;
}

/** Yönetici için: listedeki satırların yanındaki kutularla çoklu seçip toplu silme çubuğu. */
export function BulkDelete({ kind, children }: { kind: "is_emri" | "bobinaj"; children: React.ReactNode }) {
  const [state, action] = useFormState<BulkResult, FormData>(bulkDelete.bind(null, kind), null);
  const form = useRef<HTMLFormElement>(null);
  const boxes = () => Array.from(form.current?.querySelectorAll<HTMLInputElement>('input[name="ids"]') ?? []);
  const setAll = (value: boolean) => boxes().forEach(box => { box.checked = value; });
  return <form ref={form} action={action} className="space-y-3">
    <details className="rounded-xl border border-ink-600 bg-ink-800 p-3">
      <summary className="cursor-pointer text-sm text-red-300">Toplu silme (yönetici)</summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-zinc-400">Aşağıdaki listede silmek istediklerinizin kutusunu işaretleyin. Bağlı kayıtları olanlar güvenlik için silinmez.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnGhost} onClick={() => setAll(true)}>Hepsini seç</button>
          <button type="button" className={btnGhost} onClick={() => setAll(false)}>Seçimi temizle</button>
        </div>
        {kind === "is_emri" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="bobinajlar" /> Bağlı bobinaj kayıtlarını da sil</label>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm" /> Seçilenleri silmeyi onaylıyorum (geri alınamaz)</label>
        <DeleteButton />
        {state && <p role="alert" className={`text-sm ${state.ok ? "text-emerald-300" : "text-red-300"}`}>{state.message}</p>}
      </div>
    </details>
    {children}
  </form>;
}
