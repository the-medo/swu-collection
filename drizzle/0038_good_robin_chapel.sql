CREATE TABLE "game_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"deck_id" uuid,
	"match_id" text,
	"game_id" text NOT NULL,
	"game_number" smallint,
	"leader_card_id" text,
	"base_card_key" text,
	"opponent_leader_card_id" text,
	"opponent_base_card_key" text,
	"has_initiative" boolean,
	"has_mulligan" boolean,
	"exclude" boolean DEFAULT false NOT NULL,
	"game_source" text NOT NULL,
	"manually_edited" boolean DEFAULT false NOT NULL,
	"user_event_id" uuid,
	"note" text,
	"card_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"round_metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"other_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "game_result_user_id_game_id_unique" UNIQUE("user_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "user_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"date" timestamp,
	"melee_id" text,
	"deck_id" uuid,
	"leader_card_id" text,
	"base_card_key" text,
	"note" text,
	"game_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_result" ADD CONSTRAINT "game_result_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_result" ADD CONSTRAINT "game_result_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event" ADD CONSTRAINT "user_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_event" ADD CONSTRAINT "user_event_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_game_result_user_updated_at" ON "game_result" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_game_result_user_created_at" ON "game_result" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_game_result_user_match" ON "game_result" USING btree ("user_id","match_id");--> statement-breakpoint
CREATE INDEX "idx_game_result_user_deck" ON "game_result" USING btree ("user_id","deck_id");--> statement-breakpoint
CREATE INDEX "idx_user_event_user_date" ON "user_event" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_user_event_user_updated_at" ON "user_event" USING btree ("user_id","updated_at");