ALTER TABLE "bobinaj_kayitlari" ADD COLUMN "yardimci_sipir" text;--> statement-breakpoint
ALTER TABLE "bobinaj_kayitlari" ADD COLUMN "yardimci_hatve" text;--> statement-breakpoint
ALTER TABLE "bobinaj_kayitlari" ADD COLUMN "yardimci_tel_caplari_mm" numeric(6, 3)[] DEFAULT '{}' NOT NULL;