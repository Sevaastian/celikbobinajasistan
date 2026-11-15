import { CustomerForm } from "../customer-form";
import { createCustomerAction } from "../actions";

export default function NewCustomerPage({ searchParams }: { searchParams: { sonra?: string } }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Yeni müşteri</h1>
      <CustomerForm action={createCustomerAction} afterIntake={searchParams.sonra === "kabul"} cancelHref={searchParams.sonra === "kabul" ? "/is-emirleri/kabul" : "/musteriler"} />
    </div>
  );
}
