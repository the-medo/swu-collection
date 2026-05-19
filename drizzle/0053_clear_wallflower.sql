CREATE TABLE "tournament_matchup_filter" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"format" integer NOT NULL,
	"name" varchar(120),
	"is_mirrored" boolean DEFAULT false NOT NULL,
	"row_filters" jsonb NOT NULL,
	"column_filters" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_matchup_filter" ADD CONSTRAINT "tournament_matchup_filter_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matchup_filter" ADD CONSTRAINT "tournament_matchup_filter_format_format_id_fk" FOREIGN KEY ("format") REFERENCES "public"."format"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournament_matchup_filter_user_format_updated_at_idx" ON "tournament_matchup_filter" USING btree ("user_id","format","updated_at");