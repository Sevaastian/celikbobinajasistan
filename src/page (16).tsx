import { FinanceEditor } from "../editor";
export default function Page({ searchParams }: { searchParams: { musteri?: string; isEmri?: string } }) {
  return <FinanceEditor kind="payment" customer={searchParams.musteri} order={searchParams.isEmri} />;
}
