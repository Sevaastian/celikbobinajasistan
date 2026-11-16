"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "@/components/ui";
import { saveClickFeedback } from "./workshop-feedback";

export function SubmitButton({ children, pendingText = "Kaydediliyor..." }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary} onClick={saveClickFeedback}>
      {pending ? pendingText : children}
    </button>
  );
}
