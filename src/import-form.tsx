"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";
import { importWindings, type ImportState } from "./actions";

function Buttons({ canImport }: { canImport: boolean }) {
  const { pending } = useFormStatus();
  return <div className="flex flex-wrap gap-2">
    <button name="mod" value="onizle" disabled={pending} className={btnGhost}>{pending ? "Kontrol ediliyor..." : "1. Önizle ve kontrol et"}</button>
    <button name="mod" value="aktar" disabled={pending || !canImport} className={btnPrimary}>2. İçeri aktar</button>
  </div>;
}

export function ImportForm() {
  const [state, action] = useFormState<ImportState, FormData>(importWindings, null);
  const done = state?.imported !== undefined;
  const canImport = !!state && state.mode === "onizle" && !state.fatal && (state.errors?.length ?? 0) === 0 && (state.valid ?? 0) > 0;
  return <form action={action} className="space-y-4">
    <div className={cardCls}>
      <label className="mb-2 block text-sm text-zinc-300">CSV dosyası</label>
      <input type="file" name="dosya" accept=".csv,text/csv,text/plain" required className="block w-full text-sm" />
      <p className="mt-2 text-xs text-zinc-400">Dosyayı seçtikten sonra önce önizleyin. Hatasız ise "İçeri aktar" açılır. Dosyayı değiştirirseniz yeniden önizleyin.</p>
    </div>
    <Buttons canImport={canImport} />
    {state?.fatal && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.fatal}</p>}
    {done && <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
      {state!.imported} bobinaj kaydı aktarıldı{state!.createdCustomers ? `, ${state!.createdCustomers} yeni müşteri oluşturuldu` : ""}.{" "}
      <Link href="/bobinaj" className="underline">Bobinaj listesine git</Link>
    </div>}
    {state && !done && state.valid !== undefined && <div className={cardCls}>
      <p className="text-sm"><b>{state.valid}</b> satır geçerli{state.errors?.length ? <>, <b className="text-red-300">{state.errors.length}</b> hata</> : ""}. {state.newCustomers} yeni müşteri oluşturulacak, {state.existingCustomers} mevcut müşteriyle eşleşti.</p>
      {state.warnings?.map(w => <p key={w} className="mt-1 text-xs text-amber-300">{w}</p>)}
      {state.sample && state.sample.length > 0 && <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs">
        <thead className="text-zinc-400"><tr><th className="pr-3">Satır</th><th className="pr-3">Müşteri</th><th className="pr-3">Motor</th><th className="pr-3">Sipir</th><th className="pr-3">Hatve</th><th>Tel</th></tr></thead>
        <tbody>{state.sample.map(s => <tr key={s.line} className="border-t border-ink-600"><td className="pr-3">{s.line}</td><td className="pr-3">{s.customer}</td><td className="pr-3">{s.motor}</td><td className="pr-3">{s.sipir}</td><td className="pr-3">{s.hatve}</td><td>{s.wires}</td></tr>)}</tbody>
      </table><p className="mt-1 text-xs text-zinc-400">İlk {state.sample.length} satır gösteriliyor.</p></div>}
      {state.errors && state.errors.length > 0 && <ul className="mt-3 space-y-1 text-xs text-red-300">
        {state.errors.map((e, i) => <li key={i}>Satır {e.line}: {e.message}</li>)}
      </ul>}
    </div>}
  </form>;
}
