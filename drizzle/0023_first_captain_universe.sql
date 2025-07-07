CREATE TABLE "card_stat_matchup_info" (
	"id" uuid PRIMARY KEY NOT NULL,
	"info" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_stat_matchup_info" ADD CONSTRAINT "card_stat_matchup_info_id_card_stat_matchup_overview_id_fk" FOREIGN KEY ("id") REFERENCES "public"."card_stat_matchup_overview"("id") ON DELETE cascade ON UPDATE no action;