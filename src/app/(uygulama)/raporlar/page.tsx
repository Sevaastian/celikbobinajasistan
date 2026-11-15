import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { periods } from "@/lib/finance";
import { ReportLinks } from "@/components/report-links";
import { cardCls } from "@/components/ui";

export default async function Page() {
  const user = await requireUser();
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Raporlar</h1>
    <section className={cardCls}><h2 className="mb-3 font-semibold">Stok raporu</h2>
      <div className="flex flex-wrap gap-2"><ReportLinks kind="stok" /></div></section>
    {user.role !== "personel" && <>
      <section className={cardCls}><h2 className="mb-3 font-semibold">Finans raporları</h2>
        {periods.map(([key, label]) => <div key={key} className="flex flex-wrap items-center gap-2 border-t border-ink-600 py-2">
          <span className="w-24">{label}</span><ReportLinks kind="finans" period={key} /></div>)}
      </section>
      <section className={cardCls}><h2 className="mb-3 font-semibold">Müşteri bakiyeleri</h2>
        <div className="flex flex-wrap gap-2"><ReportLinks kind="bakiyeler" /></div></section>
    </>}
    <section className={cardCls}><h2 className="mb-3 font-semibold">Tekil kayıt raporları</h2>
      <p className="text-sm text-zinc-300">İndirmek istediğiniz kaydı açın.</p>
      <div className="mt-3 flex flex-wrap gap-4 text-accent-400">
        <Link href="/is-emirleri">İş emirleri</Link><Link href="/bobinaj">Bobinaj teknik formları</Link><Link href="/musteriler">Müşteri geçmişi</Link>
      </div>
    </section>
  </div>;
}
