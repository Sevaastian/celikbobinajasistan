ALTER TYPE "public"."cihaz_turu" ADD VALUE 'dalgic';--> statement-breakpoint
ALTER TYPE "public"."cihaz_turu" ADD VALUE 'fan_motoru';--> statement-breakpoint
ALTER TYPE "public"."cihaz_turu" ADD VALUE 'alternator';--> statement-breakpoint
ALTER TYPE "public"."cihaz_turu" ADD VALUE 'su_motoru';--> statement-breakpoint
ALTER TABLE "bobinaj_kayitlari" ADD COLUMN "kalip" text;