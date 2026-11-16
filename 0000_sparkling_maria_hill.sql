CREATE TYPE "public"."cihaz_turu" AS ENUM('motor', 'el_aleti', 'jenerator', 'pompa', 'diger');--> statement-breakpoint
CREATE TYPE "public"."alan_tipi" AS ENUM('metin', 'sayi', 'secim');--> statement-breakpoint
CREATE TYPE "public"."odeme_yontemi" AS ENUM('nakit', 'havale_eft', 'kredi_karti');--> statement-breakpoint
CREATE TYPE "public"."fotograf_turu" AS ENUM('ilk_gelis', 'sokum', 'eski_sargi', 'sarim_asamasi', 'bitmis_motor', 'genel');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('yonetici', 'usta', 'personel');--> statement-breakpoint
CREATE TYPE "public"."stok_kategorisi" AS ENUM('emaye_bakir_tel', 'izolasyon', 'rulman', 'komur', 'enduvi', 'stator', 'salter', 'kablo', 'kondansator', 'diger');--> statement-breakpoint
CREATE TYPE "public"."stok_hareket_turu" AS ENUM('giris', 'cikis', 'sayim_duzeltme', 'iade');--> statement-breakpoint
CREATE TYPE "public"."is_durumu" AS ENUM('yeni_geldi', 'incelemede', 'ariza_tespit_edildi', 'musteri_onayi_bekliyor', 'islemde', 'parca_bekliyor', 'test_asamasinda', 'tamamlandi', 'teslime_hazir', 'teslim_edildi', 'iptal_edildi');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "islem_gecmisi" (
	"id" serial PRIMARY KEY NOT NULL,
	"kullanici_id" integer,
	"islem" text NOT NULL,
	"varlik" text NOT NULL,
	"varlik_id" integer,
	"detay" jsonb,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "musteriler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad_firma" text NOT NULL,
	"telefon" text,
	"adres" text,
	"notlar" text,
	"kayit_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "giderler" (
	"id" serial PRIMARY KEY NOT NULL,
	"kategori" text NOT NULL,
	"aciklama" text,
	"tutar" numeric(12, 2) NOT NULL,
	"yontem" "odeme_yontemi" DEFAULT 'nakit' NOT NULL,
	"tedarikci_id" integer,
	"gider_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	"kullanici_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jenerator_servis_kayitlari" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenerator_id" integer NOT NULL,
	"is_emri_id" integer,
	"tarih" date NOT NULL,
	"tur" text DEFAULT 'bakim' NOT NULL,
	"ariza" text,
	"yapilan_islemler" text,
	"degisen_parcalar" text,
	"test_sonuclari" text,
	"calisma_saati" numeric(10, 1),
	"maliyet" numeric(12, 2) DEFAULT '0' NOT NULL,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jeneratorler" (
	"id" serial PRIMARY KEY NOT NULL,
	"musteri_id" integer,
	"marka" text,
	"model" text,
	"seri_no" text,
	"kva" numeric(10, 2),
	"kw" numeric(10, 2),
	"volt" text,
	"faz" text,
	"frekans" text,
	"calisma_saati" numeric(10, 1),
	"motor_bilgileri" text,
	"alternator_bilgileri" text,
	"notlar" text,
	"bakim_aralik_saat" integer,
	"bakim_aralik_gun" integer,
	"son_bakim_tarihi" date,
	"son_bakim_saati" numeric(10, 1),
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tahsilatlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"musteri_id" integer NOT NULL,
	"is_emri_id" integer,
	"tutar" numeric(12, 2) NOT NULL,
	"yontem" "odeme_yontemi" DEFAULT 'nakit' NOT NULL,
	"odeme_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	"not" text,
	"kullanici_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fotograflar" (
	"id" serial PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"tur" "fotograf_turu" DEFAULT 'genel' NOT NULL,
	"aciklama" text,
	"is_emri_id" integer,
	"bobinaj_id" integer,
	"yukleyen_id" integer,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pompa_tamirleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_id" integer NOT NULL,
	"marka" text,
	"model" text,
	"guc" text,
	"voltaj" text,
	"debi" text,
	"basma_yuksekligi" text,
	"ariza" text,
	"sargi_bilgileri" text,
	"rulman" text,
	"mekanik_salmastra" text,
	"yapilan_islemler" text,
	"maliyet" numeric(12, 2) DEFAULT '0' NOT NULL,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hazir_islemler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"cihaz_turu" "cihaz_turu" DEFAULT 'el_aleti' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stok_urunleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"kategori" "stok_kategorisi" DEFAULT 'diger' NOT NULL,
	"tel_capi_mm" numeric(6, 3),
	"birim" text DEFAULT 'adet' NOT NULL,
	"alis_fiyati" numeric(12, 2) DEFAULT '0' NOT NULL,
	"satis_fiyati" numeric(12, 2) DEFAULT '0' NOT NULL,
	"mevcut_miktar" numeric(12, 3) DEFAULT '0' NOT NULL,
	"minimum_stok" numeric(12, 3) DEFAULT '0' NOT NULL,
	"tedarikci_id" integer,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stok_hareketleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"stok_id" integer NOT NULL,
	"tur" "stok_hareket_turu" NOT NULL,
	"miktar" numeric(12, 3) NOT NULL,
	"birim_fiyat" numeric(12, 2),
	"is_emri_id" integer,
	"not" text,
	"kullanici_id" integer,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tedarikciler" (
	"id" serial PRIMARY KEY NOT NULL,
	"ad" text NOT NULL,
	"telefon" text,
	"adres" text,
	"notlar" text,
	"kayit_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "teknik_alanlar" (
	"id" serial PRIMARY KEY NOT NULL,
	"anahtar" text NOT NULL,
	"etiket" text NOT NULL,
	"tip" "alan_tipi" DEFAULT 'metin' NOT NULL,
	"secenekler" jsonb,
	"cihaz_turleri" text[] DEFAULT '{}' NOT NULL,
	"sira" integer DEFAULT 0 NOT NULL,
	"sistem_alani" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "el_aleti_tamirleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_id" integer NOT NULL,
	"alet_turu" text,
	"marka" text,
	"model" text,
	"seri_no" text,
	"watt" integer,
	"volt" text,
	"ariza" text,
	"tespit" text,
	"yapilan_islemler" text[] DEFAULT '{}' NOT NULL,
	"degistirilen_parcalar" text,
	"iscilik" numeric(12, 2) DEFAULT '0' NOT NULL,
	"malzeme_maliyeti" numeric(12, 2) DEFAULT '0' NOT NULL,
	"toplam_ucret" numeric(12, 2) DEFAULT '0' NOT NULL,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kullanicilar" (
	"id" serial PRIMARY KEY NOT NULL,
	"kullanici_adi" text NOT NULL,
	"ad_soyad" text NOT NULL,
	"sifre_hash" text NOT NULL,
	"rol" "rol" DEFAULT 'personel' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bobinaj_kayitlari" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_id" integer,
	"musteri_id" integer,
	"kopya_kaynak_id" integer,
	"marka" text,
	"model" text,
	"seri_no" text,
	"kw" numeric(10, 3),
	"hp" numeric(10, 3),
	"volt" text,
	"faz" text,
	"rpm" integer,
	"frekans" text,
	"kutup_sayisi" integer,
	"oluk_sayisi" integer,
	"baglanti_tipi" text,
	"govde_olcusu" text,
	"hvc" text,
	"sipir" text,
	"hatve" text,
	"hiw" text,
	"tel_capi_mm" numeric(6, 3),
	"paralel_tel_sayisi" integer,
	"bobin_sayisi" integer,
	"oluk_bilgileri" text,
	"sarim_baglantisi" text,
	"sarim_sekli" text,
	"izolasyon_bilgileri" text,
	"teknik_aciklamalar" text,
	"ek_alanlar" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"olusturan_id" integer,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "is_emri_malzemeleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_id" integer NOT NULL,
	"stok_id" integer NOT NULL,
	"miktar" numeric(12, 3) NOT NULL,
	"birim_fiyat" numeric(12, 2) NOT NULL,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "is_emri_durum_gecmisi" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_id" integer NOT NULL,
	"onceki_durum" "is_durumu",
	"yeni_durum" "is_durumu" NOT NULL,
	"kullanici_id" integer,
	"not" text,
	"tarih" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "is_emirleri" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_emri_no" text NOT NULL,
	"musteri_id" integer NOT NULL,
	"cihaz_turu" "cihaz_turu" DEFAULT 'motor' NOT NULL,
	"marka" text,
	"model" text,
	"seri_no" text,
	"gelis_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	"ariza_sikayeti" text,
	"ariza_tespiti" text,
	"yapilacak_islemler" text,
	"tahmini_ucret" numeric(12, 2),
	"kesin_ucret" numeric(12, 2),
	"atanan_kullanici_id" integer,
	"teslim_tarihi" timestamp with time zone,
	"durum" "is_durumu" DEFAULT 'yeni_geldi' NOT NULL,
	"olusturan_id" integer,
	"olusturma_tarihi" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme_tarihi" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "islem_gecmisi" ADD CONSTRAINT "islem_gecmisi_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "giderler" ADD CONSTRAINT "giderler_tedarikci_id_tedarikciler_id_fk" FOREIGN KEY ("tedarikci_id") REFERENCES "public"."tedarikciler"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "giderler" ADD CONSTRAINT "giderler_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jenerator_servis_kayitlari" ADD CONSTRAINT "jenerator_servis_kayitlari_jenerator_id_jeneratorler_id_fk" FOREIGN KEY ("jenerator_id") REFERENCES "public"."jeneratorler"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jenerator_servis_kayitlari" ADD CONSTRAINT "jenerator_servis_kayitlari_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "jeneratorler" ADD CONSTRAINT "jeneratorler_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tahsilatlar" ADD CONSTRAINT "tahsilatlar_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tahsilatlar" ADD CONSTRAINT "tahsilatlar_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tahsilatlar" ADD CONSTRAINT "tahsilatlar_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fotograflar" ADD CONSTRAINT "fotograflar_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fotograflar" ADD CONSTRAINT "fotograflar_bobinaj_id_bobinaj_kayitlari_id_fk" FOREIGN KEY ("bobinaj_id") REFERENCES "public"."bobinaj_kayitlari"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fotograflar" ADD CONSTRAINT "fotograflar_yukleyen_id_kullanicilar_id_fk" FOREIGN KEY ("yukleyen_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pompa_tamirleri" ADD CONSTRAINT "pompa_tamirleri_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stok_urunleri" ADD CONSTRAINT "stok_urunleri_tedarikci_id_tedarikciler_id_fk" FOREIGN KEY ("tedarikci_id") REFERENCES "public"."tedarikciler"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stok_hareketleri" ADD CONSTRAINT "stok_hareketleri_stok_id_stok_urunleri_id_fk" FOREIGN KEY ("stok_id") REFERENCES "public"."stok_urunleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stok_hareketleri" ADD CONSTRAINT "stok_hareketleri_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stok_hareketleri" ADD CONSTRAINT "stok_hareketleri_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "el_aleti_tamirleri" ADD CONSTRAINT "el_aleti_tamirleri_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bobinaj_kayitlari" ADD CONSTRAINT "bobinaj_kayitlari_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bobinaj_kayitlari" ADD CONSTRAINT "bobinaj_kayitlari_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bobinaj_kayitlari" ADD CONSTRAINT "bobinaj_kayitlari_kopya_kaynak_id_bobinaj_kayitlari_id_fk" FOREIGN KEY ("kopya_kaynak_id") REFERENCES "public"."bobinaj_kayitlari"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bobinaj_kayitlari" ADD CONSTRAINT "bobinaj_kayitlari_olusturan_id_kullanicilar_id_fk" FOREIGN KEY ("olusturan_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emri_malzemeleri" ADD CONSTRAINT "is_emri_malzemeleri_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emri_malzemeleri" ADD CONSTRAINT "is_emri_malzemeleri_stok_id_stok_urunleri_id_fk" FOREIGN KEY ("stok_id") REFERENCES "public"."stok_urunleri"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emri_durum_gecmisi" ADD CONSTRAINT "is_emri_durum_gecmisi_is_emri_id_is_emirleri_id_fk" FOREIGN KEY ("is_emri_id") REFERENCES "public"."is_emirleri"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emri_durum_gecmisi" ADD CONSTRAINT "is_emri_durum_gecmisi_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emirleri" ADD CONSTRAINT "is_emirleri_musteri_id_musteriler_id_fk" FOREIGN KEY ("musteri_id") REFERENCES "public"."musteriler"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emirleri" ADD CONSTRAINT "is_emirleri_atanan_kullanici_id_kullanicilar_id_fk" FOREIGN KEY ("atanan_kullanici_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "is_emirleri" ADD CONSTRAINT "is_emirleri_olusturan_id_kullanicilar_id_fk" FOREIGN KEY ("olusturan_id") REFERENCES "public"."kullanicilar"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "islem_varlik_idx" ON "islem_gecmisi" USING btree ("varlik","varlik_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "musteri_ad_idx" ON "musteriler" USING btree ("ad_firma");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "musteri_tel_idx" ON "musteriler" USING btree ("telefon");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gider_tarih_idx" ON "giderler" USING btree ("gider_tarihi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jen_servis_gen_idx" ON "jenerator_servis_kayitlari" USING btree ("jenerator_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jenerator_seri_idx" ON "jeneratorler" USING btree ("seri_no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tahsilat_musteri_idx" ON "tahsilatlar" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tahsilat_wo_idx" ON "tahsilatlar" USING btree ("is_emri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tahsilat_tarih_idx" ON "tahsilatlar" USING btree ("odeme_tarihi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foto_wo_idx" ON "fotograflar" USING btree ("is_emri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foto_bobinaj_idx" ON "fotograflar" USING btree ("bobinaj_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pompa_wo_idx" ON "pompa_tamirleri" USING btree ("is_emri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stok_kategori_idx" ON "stok_urunleri" USING btree ("kategori");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stok_hareket_stok_idx" ON "stok_hareketleri" USING btree ("stok_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "teknik_alan_key_uq" ON "teknik_alanlar" USING btree ("anahtar");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "el_aleti_wo_idx" ON "el_aleti_tamirleri" USING btree ("is_emri_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kullanici_adi_uq" ON "kullanicilar" USING btree ("kullanici_adi");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_marka_model_idx" ON "bobinaj_kayitlari" USING btree ("marka","model");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_sipir_idx" ON "bobinaj_kayitlari" USING btree ("sipir");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_hatve_idx" ON "bobinaj_kayitlari" USING btree ("hatve");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_hiw_idx" ON "bobinaj_kayitlari" USING btree ("hiw");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_tel_idx" ON "bobinaj_kayitlari" USING btree ("tel_capi_mm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_musteri_idx" ON "bobinaj_kayitlari" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wo_malzeme_wo_idx" ON "is_emri_malzemeleri" USING btree ("is_emri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "durum_gecmis_wo_idx" ON "is_emri_durum_gecmisi" USING btree ("is_emri_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "is_emri_no_uq" ON "is_emirleri" USING btree ("is_emri_no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "is_emri_musteri_idx" ON "is_emirleri" USING btree ("musteri_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "is_emri_durum_idx" ON "is_emirleri" USING btree ("durum");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "is_emri_seri_idx" ON "is_emirleri" USING btree ("seri_no");