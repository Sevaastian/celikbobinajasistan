import { RecordForm } from "./record-form";
import { deleteRecord } from "@/app/kayit-sil";

export function DeleteRecord({ kind, id }: { kind: Parameters<typeof deleteRecord>[0]; id: number }) {
  return <details className="mt-3">
    <summary className="cursor-pointer text-sm text-red-300">Kaydı sil</summary>
    <RecordForm action={deleteRecord.bind(null, kind, id)} label="Sil">
      <label className="mt-2 block text-sm"><input name="confirm" type="checkbox" required /> Silmeyi onaylıyorum</label>
    </RecordForm>
  </details>;
}
