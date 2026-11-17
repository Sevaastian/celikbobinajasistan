import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { DEVICE_LABELS } from "@/lib/format";
import { isMonophase } from "@/lib/winding-check";
import { formatWireSize } from "@/lib/wire-sizes";
import { LabelPrint } from "./print";

const ø = (sizes: (string | null)[] | null | undefined) =>
  (sizes ?? []).filter((s): s is string => !!s).map(s => formatWireSize(s).replace(" mm", "")).join("+");

export default async function Page({ params }: { params: { id: string } }) {
  await requireUser();
  const id = recordId(params.id);
  if (!id) notFound();
  const db = getDb();
  const { workOrders: order, windingRecords: w } = schema;
  const [row] = await db.select({
    number: order.number, device: order.deviceType, brand: order.brand, model: order.model,
  }).from(order).where(eq(order.id, id));
  if (!row) notFound();
  const [r] = await db.select().from(w).where(eq(w.workOrderId, id)).orderBy(desc(w.id)).limit(1);
  // Etikette kısa özet: marka/model + sipir/hatve/tel (monofazede yardımcı bobin ayrı satır).
  const lines = [[row.brand, row.model].filter(Boolean).join(" ") || DEVICE_LABELS[row.device]];
  if (r) {
    const main = [r.sipir && `S${r.sipir}`, r.hatve && `H${r.hatve}`, ø([r.wireDiameter, r.secondWireDiameter, ...(r.additionalWireDiameters ?? [])]) && `Ø${ø([r.wireDiameter, r.secondWireDiameter, ...(r.additionalWireDiameters ?? [])])}`].filter(Boolean).join(" ");
    const mono = isMonophase(r.phase);
    if (main) lines.push(mono ? `A: ${main}` : main);
    if (mono) {
      const aux = [r.auxSipir && `S${r.auxSipir}`, r.auxHatve && `H${r.auxHatve}`, ø(r.auxWireDiameters) && `Ø${ø(r.auxWireDiameters)}`].filter(Boolean).join(" ");
      if (aux) lines.push(`Y: ${aux}`);
    }
    if (r.mold) lines.push(`Kalıp ${r.mold}`);
  }
  return <LabelPrint id={id} number={row.number} lines={lines} />;
}
