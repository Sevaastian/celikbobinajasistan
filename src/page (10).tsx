import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { WindingEditor } from "../../editor";

export default async function Page({ params }: { params: { id: string } }) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const [current] = await getDb().select().from(schema.windingRecords).where(eq(schema.windingRecords.id, id));
  if (!current) notFound();
  return <WindingEditor current={current} />;
}
