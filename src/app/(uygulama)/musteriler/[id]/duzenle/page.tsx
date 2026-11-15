import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { CustomerForm } from "../../customer-form";
import { updateCustomerAction } from "../../actions";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [c] = await getDb().select().from(schema.customers).where(eq(schema.customers.id, id)).limit(1);
  if (!c) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Müşteriyi düzenle</h1>
      <CustomerForm action={updateCustomerAction} initial={c} cancelHref={`/musteriler/${id}`} />
    </div>
  );
}
