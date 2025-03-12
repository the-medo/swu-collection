CREATE TABLE "deck_information" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"favorites_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"aspect_command" integer DEFAULT 0 NOT NULL,
	"aspect_vigilance" integer DEFAULT 0 NOT NULL,
	"aspect_aggression" integer DEFAULT 0 NOT NULL,
	"aspect_cunning" integer DEFAULT 0 NOT NULL,
	"aspect_heroism" integer DEFAULT 0 NOT NULL,
	"aspect_villainy" integer DEFAULT 0 NOT NULL,
	"base_aspect" text
);
--> statement-breakpoint
ALTER TABLE "deck_information" ADD CONSTRAINT "deck_information_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_aspect_command_idx" ON "deck_information" USING btree ("aspect_command");--> statement-breakpoint
CREATE INDEX "deck_aspect_vigilance_idx" ON "deck_information" USING btree ("aspect_vigilance");--> statement-breakpoint
CREATE INDEX "deck_aspect_aggression_idx" ON "deck_information" USING btree ("aspect_aggression");--> statement-breakpoint
CREATE INDEX "deck_aspect_cunning_idx" ON "deck_information" USING btree ("aspect_cunning");--> statement-breakpoint
CREATE INDEX "deck_aspect_heroism_idx" ON "deck_information" USING btree ("aspect_heroism");--> statement-breakpoint
CREATE INDEX "deck_aspect_villainy_idx" ON "deck_information" USING btree ("aspect_villainy");--> statement-breakpoint
CREATE INDEX "deck_base_aspect_idx" ON "deck_information" USING btree ("base_aspect");