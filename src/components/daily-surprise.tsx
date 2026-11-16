const MESSAGES = [
  "Bir bobin sarılırken sabır, telin kalınlığından daha önemlidir.",
  "Sipiri sayarken konuşma; en iyi usta, saydığını kaybetmeyendir.",
  "Mıknatıs bile bazen çekinir; sen yine de ilk işi bugün bitir.",
  "Kalıbı doğru seçen, sargının yarısını kazanmıştır.",
  "Tel çapını ölçmeden sipir yazma; defter de seni hatırlar.",
  "Bugün tamamlanan her iş, yarının kaydıdır.",
  "Motor yanmadan önce bir koku bırakır. Burnunu dinle.",
  "İyi izolasyon görünmez ama her şeyi taşır.",
  "Çay soğumadan iş emrini kapat, ikisi de aynı anda sıcak kalmaz.",
  "Aynı motor ikinci kez gelirse defter işini yapmış demektir.",
  "Hatveyi yaz, kalıbı yaz, müşteriyi şaşırt.",
  "Bir kilo tel çok bobin eder; bir not bir ömür eder.",
  "Rulmanı ihmal eden, sargıyı iki kez sarar.",
  "Teslimden önce son bir kez döndür; motor yalan söylemez.",
  "Akımın yolu kısa, ustanın yolu uzundur.",
  "Gramı tart, toplamı bil: ertesi gün teklif kolay olur.",
  "Dalgıç suyu sever, ama sargı sevmez. Contayı kontrol et.",
  "Fan motorunun sesi yumuşaksa iş tamamdır.",
  "Alternatörün ışığı yanıyorsa sen de parla.",
  "Her yeni kayıt, atölyenin hafızasına atılan bir tuğladır.",
  "Meggeri unutma: izolasyon ölçmeden teslim yok.",
  "Bugün bir eski kaydı düzelt, geleceğin kendine teşekkür etsin.",
  "Küçük motor da büyük emek ister.",
  "Zor iş yok, eksik not var.",
  "Tel kalınsa sabır kalın olsun, tel inceyse el ince olsun.",
  "Atölyenin en iyi aleti, derli toplu bir kayıttır.",
  "Fiyatı söylemeden önce arızayı iyi anla.",
  "Kömür bitmeden değiştir, endüvi seni kutlar.",
  "Her gün bir müşteriyi arayıp 'hazır' demek kadar güzel iş yok.",
  "Sipir doğruysa gerisi kolay.",
] as const;

const FACES = ["🔧", "⚙️", "🔩", "🧲", "⚡"] as const;

/** Ana sayfadaki küçük maskot ve günün mesajı. Aynı gün herkes aynı mesajı görür. */
export function DailySurprise() {
  const day = Math.floor((Date.now() + 3 * 3600 * 1000) / 86400000);
  const message = MESSAGES[day % MESSAGES.length];
  const face = FACES[day % FACES.length];
  return <section className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-label="Günün mesajı">
    <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" className="shrink-0">
      <rect x="6" y="18" width="40" height="30" rx="8" className="fill-accent-500" />
      <rect x="46" y="26" width="12" height="14" rx="3" className="fill-zinc-400" />
      <rect x="14" y="12" width="24" height="8" rx="3" className="fill-accent-600" />
      <circle cx="21" cy="32" r="4" fill="#fff" /><circle cx="35" cy="32" r="4" fill="#fff" />
      <circle cx="22" cy="33" r="2" fill="#111" /><circle cx="36" cy="33" r="2" fill="#111" />
      <path d="M20 41 q8 6 16 0" stroke="#111" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <rect x="12" y="48" width="8" height="6" rx="2" className="fill-zinc-500" /><rect x="32" y="48" width="8" height="6" rx="2" className="fill-zinc-500" />
    </svg>
    <div className="min-w-0">
      <p className="text-xs text-zinc-400">Günün mesajı {face}</p>
      <p className="text-sm font-medium">{message}</p>
    </div>
  </section>;
}
