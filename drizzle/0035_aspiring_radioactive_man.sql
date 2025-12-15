CREATE TABLE "card_standard_variant" (
	"card_id" text PRIMARY KEY NOT NULL,
	"variant_id" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "csv_variant_id_idx" ON "card_standard_variant" USING btree ("variant_id");