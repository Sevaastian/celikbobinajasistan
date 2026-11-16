ALTER TABLE "bobinaj_kayitlari" ADD COLUMN "ikinci_tel_capi_mm" numeric(6, 3);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bobinaj_ikinci_tel_idx" ON "bobinaj_kayitlari" USING btree ("ikinci_tel_capi_mm");--> statement-breakpoint
INSERT INTO "stok_urunleri" ("ad", "kategori", "tel_capi_mm", "birim")
SELECT 'Emaye bakır tel ' || to_char(size / 100.0, 'FM0.00') || ' mm',
       'emaye_bakir_tel', size / 100.0, 'kg'
FROM generate_series(10, 200, 5) AS diameters(size)
WHERE NOT EXISTS (
  SELECT 1 FROM "stok_urunleri"
  WHERE "kategori" = 'emaye_bakir_tel' AND "tel_capi_mm" = size / 100.0
);
