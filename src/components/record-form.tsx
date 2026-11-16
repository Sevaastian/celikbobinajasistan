"use client";

import { errorFeedback, successFeedback } from "./workshop-feedback";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/submit-button";

export function RecordForm({ action, children, label = "Kaydet", notify = false }: {
  action: (previous: string | null, data: FormData) => Promise<string | null>;
  children: React.ReactNode;
  label?: string;
  notify?: boolean;
}) {
  const [error, formAction] = useFormState(async (state: string | null, data: FormData) => {
    const result = await action(state, data);
    if (result === null && notify) successFeedback();
    if (result !== null) errorFeedback();
    return result;
  }, null);
  return (
    <form action={formAction} className="space-y-5">
      {children}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <SubmitButton>{label}</SubmitButton>
    </form>
  );
}
