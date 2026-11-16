CREATE TABLE IF NOT EXISTS "giris_denemeleri" (
	"anahtar" text PRIMARY KEY NOT NULL,
	"deneme" integer DEFAULT 0 NOT NULL,
	"pencere_basi" timestamp with time zone DEFAULT now() NOT NULL,
	"kilit_bitis" timestamp with time zone
);
