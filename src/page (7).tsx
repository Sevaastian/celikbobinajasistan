import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { btnGhost, cardCls } from "@/components/ui";
import { ImportForm } from "./import-form";

export default async function Page() {
  await requireUser("usta");
  return <div className="space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">Eski kayıtları içeri aktar</h1>
      <Link href="/bobinaj" className={btnGhost}>Geri</Link>
    </header>
    <section className={`${cardCls} space-y-2 text-sm text-zinc-300`}>
      <p>Defterdeki eski bobinaj kayıtlarını Excel'de doldurup <b>CSV (noktalı virgül veya virgülle ayrılmış)</b> olarak kaydedin ve buradan yükleyin.</p>
      <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
        <li>Şablonu indirin, örnek satırı silip kayıtlarınızı yazın. Her satır bir motor.</li>
        <li>Müşteri adı yazarsanız mevcut müşteriyle eşleşir, yoksa yeni müşteri açılır.</li>
        <li>Tel çapı ondalıklı yazılır (0,90). Boş bırakılan sütunlar atlanır. Tarih: gg.aa.yyyy.</li>
        <li>Önce önizleyin; hata varsa satır numarasıyla gösterilir, hiçbir şey eklenmez.</li>
      </ol>
      <a href="/api/sablon/bobinaj" className={btnGhost}>Şablon dosyasını indir (.csv)</a>
    </section>
    <ImportForm />
  </div>;
}
