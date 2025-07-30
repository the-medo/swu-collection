CREATE TABLE "card_variant_price_history" (
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"source_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"data" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	CONSTRAINT "card_variant_price_history_pk" PRIMARY KEY("card_id","variant_id","source_type","created_at")
);
--> statement-breakpoint
CREATE TABLE "card_variant_price" (
	"card_id" text NOT NULL,
	"variant_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_link" text NOT NULL,
	"updated_at" timestamp,
	"data" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	CONSTRAINT "card_variant_price_pk" PRIMARY KEY("card_id","variant_id","source_type")
);
--> statement-breakpoint
CREATE INDEX "cvp_card_id_idx" ON "card_variant_price" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cvp_variant_id_idx" ON "card_variant_price" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "cvp_source_type_idx" ON "card_variant_price" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "cvp_price_idx" ON "card_variant_price" USING btree ("price");
CREATE INDEX "cvph_card_id_idx" ON "card_variant_price_history" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cvph_variant_id_idx" ON "card_variant_price_history" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "cvph_source_type_idx" ON "card_variant_price_history" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "cvph_created_at_idx" ON "card_variant_price_history" USING btree ("created_at");
CREATE INDEX "cvph_price_idx" ON "card_variant_price_history" USING btree ("price");