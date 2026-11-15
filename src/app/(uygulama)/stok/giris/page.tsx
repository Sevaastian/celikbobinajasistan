import { requireUser } from "@/lib/auth";
import { recordId } from "@/lib/record-input";
import { Movement } from "../movement";

export default async function Page({ searchParams }: { searchParams: { urun?: string } }) {
  await requireUser("usta");
  return <Movement stockId={recordId(searchParams.urun)} />;
}
