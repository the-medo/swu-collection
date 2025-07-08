CREATE TABLE "card_stat_matchup_decks" (
	"id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	CONSTRAINT "card_stat_matchup_decks_id_deck_id_pk" PRIMARY KEY("id","deck_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_matchup_overview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"params" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "card_stat_matchup_tournaments" (
	"id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	CONSTRAINT "card_stat_matchup_tournaments_id_tournament_id_pk" PRIMARY KEY("id","tournament_id")
);
--> statement-breakpoint
ALTER TABLE "card_stat_matchup_decks" ADD CONSTRAINT "csmd_decks_id_card_stat_matchup_overview_id_fk" FOREIGN KEY ("id") REFERENCES "public"."card_stat_matchup_overview"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_matchup_decks" ADD CONSTRAINT "csmd_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_matchup_overview" ADD CONSTRAINT "csmo_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_matchup_tournaments" ADD CONSTRAINT "csmt_id_card_stat_matchup_overview_id_fk" FOREIGN KEY ("id") REFERENCES "public"."card_stat_matchup_overview"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_matchup_tournaments" ADD CONSTRAINT "csmt_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csmd-id_idx" ON "card_stat_matchup_decks" USING btree ("id");--> statement-breakpoint
CREATE INDEX "csmd-deck_id_idx" ON "card_stat_matchup_decks" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "csmo-user_id_idx" ON "card_stat_matchup_overview" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "csmo-created_at_idx" ON "card_stat_matchup_overview" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "csmt-id_idx" ON "card_stat_matchup_tournaments" USING btree ("id");--> statement-breakpoint
CREATE INDEX "csmt-tournament_id_idx" ON "card_stat_matchup_tournaments" USING btree ("tournament_id");