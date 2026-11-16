import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { DEVICE_LABELS } from "@/lib/format";
import { LabelPrint } from "./print";

export default async function Page({ params }: { params: { id: string } }) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const { workOrders: order } = schema;
  const [row] = await getDb().select({
    number: order.number, device: order.deviceType, brand: order.brand, model: order.model,
  }).from(order).where(eq(order.id, id));
  if (!row) notFound();
  return <LabelPrint id={id} number={row.number} device={[DEVICE_LABELS[row.device], row.brand, row.model].filter(Boolean).join(" · ")} />;
}
