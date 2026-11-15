import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { WindingEditor } from "../editor";

export default async function Page({ searchParams }: { searchParams: { kopya?: string; isEmri?: string } }) {
  await requireUser();
  const id = recordId(searchParams.kopya);
  const [source] = id ? await getDb().select().from(schema.windingRecords).where(eq(schema.windingRecords.id, id)) : [];
  if (searchParams.kopya && !source) notFound();
  return <WindingEditor source={source} orderId={recordId(searchParams.isEmri)} />;
}
