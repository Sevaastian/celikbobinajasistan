"use client";

import { useFormState } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction, type FormState } from "./actions";

export function DeleteCustomerButton({ id }: { id: number }) {
  const [state, action] = useFormState<FormState, FormData>(deleteCustomerAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Bu müşteri kalıcı olarak silinecek. Emin misiniz?")) e.preventDefault();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="id" value={id} />
      <button className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10">
        <Trash2 size={16} /> Sil
      </button>
      {state.error && <p role="alert" className="max-w-md text-sm text-red-400">{state.error}</p>}
    </form>
  );
}
