"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";
import { btnGhost, inputCls, labelCls } from "@/components/ui";
import type { FormState } from "./actions";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: { id: number; name: string; phone: string | null; address: string | null; notes: string | null };
  cancelHref: string;
  afterIntake?: boolean;
};

export function CustomerForm({ action, initial, cancelHref, afterIntake }: Props) {
  const [state, formAction] = useFormState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {afterIntake && <input type="hidden" name="afterIntake" value="1" />}
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block">
        <span className={labelCls}>Ad soyad / firma *</span>
        <input name="name" required defaultValue={initial?.name} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>Telefon</span>
        <input name="phone" type="tel" inputMode="tel" defaultValue={initial?.phone ?? ""} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>Adres</span>
        <textarea name="address" rows={2} defaultValue={initial?.address ?? ""} className={inputCls} />
      </label>
      <label className="block">
        <span className={labelCls}>Notlar</span>
        <textarea name="notes" rows={3} defaultValue={initial?.notes ?? ""} className={inputCls} />
      </label>
      {state.error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <SubmitButton>Kaydet</SubmitButton>
        <Link href={cancelHref} className={btnGhost}>Vazgeç</Link>
      </div>
    </form>
  );
}
