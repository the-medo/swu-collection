ALTER TABLE "game_result" ADD COLUMN "is_winner" boolean;--> statement-breakpoint
ALTER TABLE "game_result" ADD COLUMN "contains_unknown_cards" boolean DEFAULT false NOT NULL;