# Çelik Bobinaj — Atölye Yönetim Sistemi

Next.js · TypeScript · Tailwind CSS · Drizzle ORM · Neon PostgreSQL

## Mevcut Vercel projesini güncelleme

1. ZIP’i açın. İçindeki `celik-bobinaj` klasörünün içeriğini mevcut GitHub deposunun köküne aktarın. `drizzle`, `src/assets` ve `package-lock.json` dosyalarını da yükleyin.
2. Vercel’de mevcut Neon bağlantısını ve ortam değişkenlerini kullanın. Derleme komutu `npm run build` olmalıdır. Komut mevcut kayıtlara ek teknik alan sütunlarını uygulayan migration’ı, başlangıç verilerini ve derlemeyi çalıştırır.
3. Dağıtım tamamlandıktan sonra mevcut hesabınızla giriş yapın. Bir deneme iş emri üzerinden bobinaj, stok, tahsilat ve PDF adımlarını kontrol edin.

Ortam değişkenleri `.env.example` dosyasında listelenir. Gerçek değerleri Vercel ortam değişkenlerinde tutun. İlk yönetici yalnızca boş kullanıcı tablosunda oluşturulur. Şifreyi **Hesabım** sayfasından değiştirebilirsiniz.

## Yerel kurulum

```bash
npm ci
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

`.env` içinde geliştirme veritabanını ve giriş değişkenlerini tanımlayın. Yalnızca derleme kontrolü için `npm run build:local` çalıştırabilirsiniz.

## Sürüm 3

Genel Bakış veya İş Emirleri ekranından Hızlı Kabul açılır. İş emrindeki QR Etiket düğmesi cihaz etiketini yazdırır. QR, etiketi oluşturduğunuz site adresine yönlendirir ve erişim için oturum gerekir. Motor iş emirlerindeki Söküm Ekranı önceki bobinajları, yeni teknik kaydı, notları ve fotoğrafları bir araya getirir. Hoparlör simgesinden işlem sesini açabilirsiniz.

## Sürüm 2

Bobinajda 0,10–2,00 mm arası 39 standart tel çapı bulunur. Bir kayıt için 10 tele kadar çap seçilebilir. Liste ve genel arama tüm tellerde eşleşme arar. Güncelleme eksik tel çaplarını depoya sıfır miktarla ekler ve mevcut ürünleri korur.

## Kullanım

- Yönetici kullanıcıları açar, rollerini düzenler, hesapları pasife alır ve son işlem geçmişini görür.
- Personel müşteri, cihaz, iş emri, servis ve bobinaj kaydı oluşturur. İş emrine eklenen kullanılan malzeme stoktan düşer.
- Usta ve yönetici depo hareketleri, tedarikçiler, tahsilat, gider ve finans raporlarını yönetir.
- İş emri tutarını kesin ücret alanına girin. Müşteri bakiyesi kesin iş tutarlarını ve tahsilatları ayrı toplar. Fazla tahsilat avans olarak görünür.
- Bobinajda Sipir ve Hatve bağımsızdır. HİW ekrandan, aramadan ve raporlardan kaldırıldı. Mevcut HİW değerleri veritabanında saklanır. Seri numarasıyla önceki kayıtları bulun ve teknik alanları yeni kayda kopyalayın.
- İş emri ve bobinaj detaylarında kaydı açan kişi, düzenlemeler ve tarihli atölye notları görünür. Her çalışana ayrı kullanıcı hesabı açın.
- Bakım takibi için jeneratörün bakım aralığını ve servis geçmişinde son bakım tarihini veya saatini kaydedin.
- Teknik alanları cihaz türüne göre ayarlayın. Fotoğraflar telefonda otomatik küçültülür (en uzun kenar 1600 px); en fazla 4 MB, JPEG/PNG/WebP kabul edilir. Depolama için aşağıdaki "Fotoğraf depolama" bölümüne bakın.
- Raporlar PDF veya Türkçe Excel ile açılabilen UTF-8 CSV biçiminde indirilir. İş emri, bobinaj ve müşteri raporları ilgili kaydın detay sayfasındadır.

## iPhone'a uygulama gibi ekleme

Safari'de siteyi açın, Paylaş düğmesine basın, **Ana Ekrana Ekle** deyin. Uygulama tam ekran, kendi simgesiyle açılır; çentik ve ana ekran çubuğu alanları güvenli alanla korunur. Giriş yaptıktan sonra oturum 12 saat açık kalır.
Simge veya renk değiştirmek için `public/icons` ve `public/manifest.webmanifest` dosyalarını düzenleyin. Simgeyi değiştirdikten sonra iPhone'da uygulamayı silip yeniden eklemek gerekir.

## Fotoğraf depolama (Vercel Blob)

Vercel'de projenin **Storage** sekmesinden bir **Blob** deposu oluşturup projeye bağlayın; `BLOB_READ_WRITE_TOKEN` otomatik eklenir, sonra yeniden deploy edin.
Token varsa yeni fotoğraflar Blob'a gider, veritabanında yalnızca adresi tutulur (Neon kapasitesi dolmaz). Token yoksa fotoğraflar veritabanına yazılır; sistem yine çalışır.
Fotoğraflar tarayıcıya Blob adresiyle değil, giriş kontrolü yapan `/fotograf/<no>` üzerinden verilir. Eski (veritabanındaki) fotoğraflar olduğu gibi çalışmaya devam eder.

## Giriş koruması

Aynı kullanıcı adı ve aynı IP'den 5 hatalı girişte 15 dakika, aynı IP'den toplam 30 hatalı girişte 15 dakika giriş engellenir. Başarılı giriş sayacı sıfırlar. Başka bir IP'den gelen gerçek kullanıcı etkilenmez.

## Veri yedeği

Yönetici, **Veri Yedeği** sayfasından tüm kayıtları tek dosya (`.ndjson`) olarak indirir. Haftada bir indirip telefon/bilgisayar dışında da saklayın.
Geri yükleme bilgisayardan yapılır ve mevcut tüm veriyi siler:

```bash
npm run db:restore -- celik-bobinaj-yedek-2026-11-14.ndjson          # dosyayı doğrular, özet gösterir
npm run db:restore -- celik-bobinaj-yedek-2026-11-14.ndjson --onayla # gerçekten geri yükler
```

Yedek dosyasında kullanıcı şifre özetleri bulunur; paylaşmayın. Blob'daki fotoğraf dosyaları yedeğe girmez, yalnızca kayıtları girer.

## Test

`npm run test:db` bellek içi bir PostgreSQL ile tüm migration'ları, giriş kilidini ve yedek-geri yükleme turunu dener.
