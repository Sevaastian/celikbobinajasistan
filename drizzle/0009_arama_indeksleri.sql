-- Büyük kayıt sayılarında (on binlerce) listeleme ve arama hızı için indeksler.
-- pg_trgm: "%metin%" biçimindeki ilike aramalarını hızlandırır. Eklenti kurulamazsa (izin yok vb.)
-- migration başarısız olmasın diye korumalıdır; yalnızca sıralama indeksleri kalır.
CREATE INDEX IF NOT EXISTS "is_emri_gelis_idx" ON "is_emirleri" ("gelis_tarihi" DESC, "id" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_olusturma_idx" ON "bobinaj_kayitlari" ("olusturma_tarihi" DESC, "id" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "musteri_kayit_idx" ON "musteriler" ("kayit_tarihi" DESC, "id" DESC);--> statement-breakpoint
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE INDEX IF NOT EXISTS "musteri_ad_trgm" ON "musteriler" USING gin ("ad_firma" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "musteri_tel_trgm" ON "musteriler" USING gin ("telefon" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "is_emri_no_trgm" ON "is_emirleri" USING gin ("is_emri_no" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "is_emri_marka_trgm" ON "is_emirleri" USING gin ("marka" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "is_emri_model_trgm" ON "is_emirleri" USING gin ("model" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "is_emri_seri_trgm" ON "is_emirleri" USING gin ("seri_no" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bobinaj_marka_trgm" ON "bobinaj_kayitlari" USING gin ("marka" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bobinaj_model_trgm" ON "bobinaj_kayitlari" USING gin ("model" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bobinaj_seri_trgm" ON "bobinaj_kayitlari" USING gin ("seri_no" gin_trgm_ops);
  CREATE INDEX IF NOT EXISTS "bobinaj_kalip_trgm" ON "bobinaj_kayitlari" USING gin ("kalip" gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm indeksleri atlandı: %', SQLERRM;
END $$;
