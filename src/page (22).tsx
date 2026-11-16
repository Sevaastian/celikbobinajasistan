import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { OrderEditor } from "../editor";

export default async function Page({ searchParams }: { searchParams: { musteri?: string; cihaz?: string } }) {
  await requireUser();
  return <OrderEditor deviceType={searchParams.cihaz} customerId={recordId(searchParams.musteri)} />;
}
