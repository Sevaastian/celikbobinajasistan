import { requireUser } from "@/lib/auth";
import { WireCalculator } from "@/components/wire-calculator";

export default async function Page() {
  await requireUser();
  return <div className="mx-auto max-w-2xl space-y-4">
    <h1 className="text-2xl font-bold">Hesaplayıcı</h1>
    <WireCalculator />
  </div>;
}
