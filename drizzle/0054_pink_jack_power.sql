CREATE TABLE "preview_card" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"card_id" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"official_card_id" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "preview_card_card_id_uidx" ON "preview_card" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "preview_card_status_idx" ON "preview_card" USING btree ("status");--> statement-breakpoint
CREATE INDEX "preview_card_official_card_id_idx" ON "preview_card" USING btree ("official_card_id");--> statement-breakpoint
CREATE INDEX "preview_card_updated_at_idx" ON "preview_card" USING btree ("updated_at");