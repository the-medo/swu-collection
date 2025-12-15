CREATE TABLE "entity_price" (
	"entity_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"type" text NOT NULL,
	"updated_at" timestamp,
	"data" text,
	"data_missing" text,
	"price" numeric(12, 2),
	"price_missing" integer,
	CONSTRAINT "entity_price_pk" PRIMARY KEY("entity_id","source_type")
);
--> statement-breakpoint
ALTER TABLE "card_pools" ALTER COLUMN "archived_at" SET DATA TYPE timestamp;--> statement-breakpoint
CREATE INDEX "ep_entity_id_idx" ON "entity_price" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "ep_type_idx" ON "entity_price" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ep_source_type_idx" ON "entity_price" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "ep_price_idx" ON "entity_price" USING btree ("price");--> statement-breakpoint
CREATE INDEX "ep_updated_at_idx" ON "entity_price" USING btree ("updated_at");