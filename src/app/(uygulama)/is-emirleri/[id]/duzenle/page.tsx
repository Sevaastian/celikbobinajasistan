import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { OrderEditor } from "../../editor";

export default async function Page({ params }: { params: { id: string } }) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const [order] = await getDb().select().from(schema.workOrders).where(eq(schema.workOrders.id, id));
  if (!order) notFound();
  return <OrderEditor order={order} />;
}
