CREATE TABLE "collection_import" (
	"id" uuid PRIMARY KEY NOT NULL,
	"collection_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"file_name" text,
	"headers" jsonb NOT NULL,
	"total_rows" integer NOT NULL,
	"imported_rows" integer NOT NULL,
	"imported_copies" integer NOT NULL,
	"problem_rows" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_import_row" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"values" jsonb NOT NULL,
	"raw" text NOT NULL,
	"problem" text NOT NULL,
	"message" text NOT NULL,
	"related_rows" jsonb NOT NULL,
	"match" jsonb,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "collection_import" ADD CONSTRAINT "collection_import_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_import_row" ADD CONSTRAINT "collection_import_row_import_id_collection_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."collection_import"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_import_collection_created_idx" ON "collection_import" USING btree ("collection_id","created_at");--> statement-breakpoint
CREATE INDEX "collection_import_row_import_idx" ON "collection_import_row" USING btree ("import_id","row_number");