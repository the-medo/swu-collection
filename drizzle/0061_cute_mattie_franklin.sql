CREATE TABLE "deck_import_source" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"source" varchar NOT NULL,
	"source_deck_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"refreshed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck_import_source" ADD CONSTRAINT "deck_import_source_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_import_source-source_deck_id_idx" ON "deck_import_source" USING btree ("source","source_deck_id");