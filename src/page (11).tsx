import { RepairPage } from "@/components/repair-page";
import { recordId } from "@/lib/record-input";
export default function Page({ searchParams }: { searchParams: { isEmri?: string } }) {
  return <RepairPage kind="el_aleti" orderId={recordId(searchParams.isEmri)} />;
}
