CREATE TABLE "karabast_unimplemented_cards" (
	"title" text PRIMARY KEY NOT NULL,
	"card_id" text,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "karabast_unimplemented_cards_card_id_idx" ON "karabast_unimplemented_cards" USING btree ("card_id");
--> statement-breakpoint
INSERT INTO "application_configuration" (key, value) VALUES ('karabast_unimplemented_datetime', '1970-01-01T00:00:00.000Z') ON CONFLICT (key) DO NOTHING;
