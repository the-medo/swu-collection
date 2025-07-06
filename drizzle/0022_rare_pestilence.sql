ALTER TABLE "deck_information" ADD COLUMN "base_special_name" text;--> statement-breakpoint
CREATE INDEX "deck_base_special_name_idx" ON "deck_information" USING btree ("base_special_name");