import { and, desc, eq, inArray } from "drizzle-orm";
import { addWorkshopNote } from "@/app/atolye-notu";
import { getDb, schema } from "@/db";
import { formatDateTime } from "@/lib/format";
import { Field } from "./record-fields";
import { RecordForm } from "./record-form";
import { cardCls } from "./ui";

export async function WorkshopHistory({ kind, id, createdBy, createdAt }: {
  kind: "is_emri" | "bobinaj"; id: number; createdBy: number | null; createdAt: Date;
}) {
  const db = getDb();
  const { activityLogs: l, users: u } = schema;
  const [[creator], entries] = await Promise.all([
    createdBy ? db.select({ name: u.fullName }).from(u).where(eq(u.id, createdBy)) : [],
    db.select({ log: l, name: u.fullName }).from(l).leftJoin(u, eq(u.id, l.userId))
      .where(and(eq(l.entity, kind), eq(l.entityId, id), inArray(l.action, ["guncelle", "atolye_notu"])))
      .orderBy(desc(l.createdAt), desc(l.id)),
  ]);
  const noteLabel = kind === "bobinaj" ? "Söküm / sargı notu" : "İş emri notu";
  return <section className={cardCls}>
    <h2 className="mb-2 font-semibold">Kayıt ve not geçmişi</h2>
    <p className="mb-4 text-sm">Kaydı açan <strong>{creator?.name ?? "Bilinmiyor"}</strong> · {formatDateTime(createdAt)}</p>
    <RecordForm key={entries[0]?.log.id ?? 0} action={addWorkshopNote.bind(null, kind, id)} label="Not ekle" notify>
      <Field name="note" label={noteLabel} multiline required />
    </RecordForm>
    <ul className="mt-4 space-y-3">
      {entries.map(({ log, name }) => {
        const details = log.details as { note?: string; author?: string } | null;
        return <li className="border-t border-ink-600 pt-3 text-sm" key={log.id}>
          <p><strong>{details?.author ?? name ?? "Bilinmiyor"}</strong> · {formatDateTime(log.createdAt)} · {
            log.action === "atolye_notu" ? noteLabel : details?.note ? "Teknik açıklama güncellendi" : "Kayıt düzenlendi"
          }</p>
          {details?.note && <p className="mt-1 whitespace-pre-wrap break-words">{details.note}</p>}
        </li>;
      })}
    </ul>
  </section>;
}
