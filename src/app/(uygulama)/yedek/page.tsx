import { DatabaseBackup, Download } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { btnGhost, btnPrimary, cardCls } from "@/components/ui";

export default async function BackupPage() {
  await requireUser("yonetici");
  const blob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  return <div className="space-y-4">
    <h1 className="flex items-center gap-2 text-2xl font-bold"><DatabaseBackup /> Veri Yedeği</h1>
    <section className={cardCls + " space-y-3"}>
      <p className="text-sm text-zinc-300">
        Müşteriler, iş emirleri, bobinaj teknik kayıtları, stok, finans, kullanıcılar ve işlem geçmişi tek dosya olarak indirilir.
        Düzenli aralıklarla (örneğin haftada bir) indirip telefon veya bilgisayar dışında bir yerde de saklayın.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href="/api/yedek" className={btnPrimary}><Download size={16} /> Yedeği indir</a>
        <a href="/api/yedek?fotograf=1" className={btnGhost}><Download size={16} /> Fotoğraf içerikleriyle birlikte indir</a>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400">
        <li>Dosyada kullanıcıların şifre özetleri de bulunur. Dosyayı başkalarıyla paylaşmayın.</li>
        {blob
          ? <li>Fotoğraflar Vercel Blob’da duruyor. Yedek dosyası fotoğrafların kayıtlarını içerir, görsel dosyaların kendisini içermez; onlar Blob’da kalır.</li>
          : <li>Fotoğraflar veritabanında duruyor. “Fotoğraf içerikleriyle” seçeneği dosyayı çok büyütebilir; telefon yerine bilgisayardan indirmeniz önerilir.</li>}
        <li>Geri yükleme bilgisayardan yapılır: <code className="rounded bg-ink-900 px-1">npm run db:restore -- dosya.ndjson --onayla</code>. Bu işlem mevcut tüm veriyi siler.</li>
      </ul>
    </section>
  </div>;
}
