ALTER TABLE "deck_information" ADD COLUMN "score" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_information" ADD COLUMN "scored_at" timestamp DEFAULT now() NOT NULL;