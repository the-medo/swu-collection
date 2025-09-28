CREATE TABLE "collection_source_collection" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection_id" uuid NOT NULL,
	"source_collection_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"display_on_source" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_source_collection" ADD CONSTRAINT "csc_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_source_collection" ADD CONSTRAINT "csc_source_collection_id_fk" FOREIGN KEY ("source_collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csc-collection_id_idx" ON "collection_source_collection" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "csc-source_collection_id_idx" ON "collection_source_collection" USING btree ("source_collection_id");--> statement-breakpoint
CREATE INDEX "csc-display_on_source_idx" ON "collection_source_collection" USING btree ("display_on_source");