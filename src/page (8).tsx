import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { ReadyRecordPicker } from "@/components/ready-record-picker";
import { WindingEditor } from "../editor";

export default async function Page({ searchParams }: { searchParams: { kopya?: string; isEmri?: string; ara?: string; musteri?: string } }) {
  await requireUser();
  const id = recordId(searchParams.kopya);
  const [source] = id ? await getDb().select().from(schema.windingRecords).where(eq(schema.windingRecords.id, id)) : [];
  if (searchParams.kopya && !source) notFound();
  const orderId = recordId(searchParams.isEmri);
  const customerId = recordId(searchParams.musteri);
  const params: Record<string, string> = {};
  if (orderId) params.isEmri = String(orderId);
  if (customerId) params.musteri = String(customerId);
  return <WindingEditor source={source} orderId={orderId} customerId={customerId}
    picker={<ReadyRecordPicker base="/bobinaj/yeni" params={params} search={searchParams.ara ?? ""} />} />;
}
