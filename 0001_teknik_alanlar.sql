ALTER TABLE "jeneratorler" ADD COLUMN "ek_alanlar" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pompa_tamirleri" ADD COLUMN "ek_alanlar" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "el_aleti_tamirleri" ADD COLUMN "ek_alanlar" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "is_emirleri" ADD COLUMN "ek_alanlar" jsonb DEFAULT '{}'::jsonb NOT NULL;