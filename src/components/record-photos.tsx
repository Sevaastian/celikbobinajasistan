import { DeleteRecord } from "@/components/delete-record";
import { requireUser } from "@/lib/auth";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { addPhoto } from "@/app/fotograf/actions";
import { photoLabels } from "@/lib/photo-kinds";
import { RecordForm } from "./record-form";
import { Field, SelectField } from "./record-fields";
import { cardCls } from "./ui";
import { PhotoPicker } from "./photo-picker";

export async function RecordPhotos({ target, id, defaultKind }: { target: "order" | "winding"; id: number; defaultKind?: string }) {
  const user = await requireUser();
  const { photos } = schema;
  const items = await getDb().select({ id: photos.id, caption: photos.caption, kind: photos.kind }).from(photos)
    .where(eq(target === "order" ? photos.workOrderId : photos.windingRecordId, id)).orderBy(desc(photos.id));

  return <section className={cardCls}>
    <h2 className="mb-3 font-semibold">Fotoğraflar</h2>
    {items.length > 0 && <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map(item => <figure key={item.id}>
        <a href={`/fotograf/${item.id}`} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/fotograf/${item.id}`} alt={item.caption ?? photoLabels[item.kind]}
            loading="lazy" className="aspect-square w-full rounded-lg bg-ink-900 object-cover" />
        </a>
        <figcaption className="mt-1 break-words text-sm text-zinc-300">{photoLabels[item.kind]}{item.caption && ` · ${item.caption}`}</figcaption>
        {user.role === "yonetici" && <DeleteRecord kind="fotograf" id={item.id} />}
      </figure>)}
    </div>}
    <RecordForm action={addPhoto.bind(null, target, id)} label="Fotoğraf yükle" notify>
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoPicker />
        <SelectField label="Fotoğraf türü" name="kind" value={defaultKind ?? (target === "order" ? "genel" : "ilk_gelis")} options={Object.entries(photoLabels)} />
        <Field label="Açıklama" name="caption" />
      </div>
    </RecordForm>
  </section>;
}

export function OrderPhotos({ orderId }: { orderId: number }) {
  return <RecordPhotos target="order" id={orderId} />;
}
