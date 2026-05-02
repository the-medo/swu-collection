CREATE TYPE "public"."tournament_import_status" AS ENUM('pending', 'running', 'finished', 'failed');--> statement-breakpoint
CREATE TYPE "public"."tournament_weekend_tournament_status" AS ENUM('upcoming', 'running', 'finished', 'unknown');--> statement-breakpoint
CREATE TABLE "player" (
	"id" integer PRIMARY KEY NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_watch" (
	"user_id" text NOT NULL,
	"player_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pw_pk" PRIMARY KEY("user_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_import" (
	"tournament_id" uuid PRIMARY KEY NOT NULL,
	"status" "tournament_import_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_standing" (
	"tournament_id" uuid NOT NULL,
	"player_id" integer NOT NULL,
	"round_number" integer NOT NULL,
	"rank" integer NOT NULL,
	"points" integer NOT NULL,
	"game_record" varchar(20) NOT NULL,
	"match_record" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ts_pk" PRIMARY KEY("tournament_id","round_number","player_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_weekend" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"is_live" boolean DEFAULT false NOT NULL,
	"tournaments_upcoming" integer DEFAULT 0 NOT NULL,
	"tournaments_running" integer DEFAULT 0 NOT NULL,
	"tournaments_finished" integer DEFAULT 0 NOT NULL,
	"tournaments_unknown" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_weekend_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"match_key" varchar(255) NOT NULL,
	"player_id_1" integer NOT NULL,
	"player_id_2" integer,
	"leader_card_id_1" varchar(255),
	"base_card_key_1" varchar(255),
	"leader_card_id_2" varchar(255),
	"base_card_key_2" varchar(255),
	"player_1_game_win" integer,
	"player_2_game_win" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tournament_weekend_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"user_id" text,
	"resource_type" varchar(50) NOT NULL,
	"resource_url" text NOT NULL,
	"title" varchar(255),
	"description" text,
	"approved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_weekend_tournament" (
	"tournament_weekend_id" uuid NOT NULL,
	"tournament_id" uuid NOT NULL,
	"status" "tournament_weekend_tournament_status" DEFAULT 'unknown' NOT NULL,
	"has_decklists" boolean DEFAULT false NOT NULL,
	"additional_data" text,
	"round_number" integer,
	"round_name" varchar(255),
	"matches_total" integer,
	"matches_remaining" integer,
	"exact_start" timestamp,
	"last_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twt_pk" PRIMARY KEY("tournament_weekend_id","tournament_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_weekend_tournament_group" (
	"tournament_weekend_id" uuid NOT NULL,
	"tournament_group_id" uuid NOT NULL,
	"format_id" integer,
	"meta_id" integer,
	CONSTRAINT "twtg_pk" PRIMARY KEY("tournament_weekend_id","tournament_group_id")
);
--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_watch" ADD CONSTRAINT "pw_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_watch" ADD CONSTRAINT "pw_player_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_import" ADD CONSTRAINT "ti_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standing" ADD CONSTRAINT "ts_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_standing" ADD CONSTRAINT "ts_player_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD CONSTRAINT "twm_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD CONSTRAINT "twm_player1_fk" FOREIGN KEY ("player_id_1") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD CONSTRAINT "twm_player2_fk" FOREIGN KEY ("player_id_2") REFERENCES "public"."player"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_resource" ADD CONSTRAINT "twr_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_resource" ADD CONSTRAINT "twr_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament" ADD CONSTRAINT "twt_weekend_fk" FOREIGN KEY ("tournament_weekend_id") REFERENCES "public"."tournament_weekend"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament" ADD CONSTRAINT "twt_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament_group" ADD CONSTRAINT "twtg_weekend_fk" FOREIGN KEY ("tournament_weekend_id") REFERENCES "public"."tournament_weekend"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament_group" ADD CONSTRAINT "twtg_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament_group" ADD CONSTRAINT "twtg_format_fk" FOREIGN KEY ("format_id") REFERENCES "public"."format"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_tournament_group" ADD CONSTRAINT "twtg_meta_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."meta"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_display_idx" ON "player" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "player_user_idx" ON "player" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pw_user_idx" ON "player_watch" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pw_player_idx" ON "player_watch" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "ti_status_idx" ON "tournament_import" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ti_created_idx" ON "tournament_import" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ts_tournament_round_idx" ON "tournament_standing" USING btree ("tournament_id","round_number");--> statement-breakpoint
CREATE INDEX "ts_player_idx" ON "tournament_standing" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "tw_date_idx" ON "tournament_weekend" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tw_live_idx" ON "tournament_weekend" USING btree ("is_live");--> statement-breakpoint
CREATE UNIQUE INDEX "tw_one_live_uidx" ON "tournament_weekend" USING btree ("is_live") WHERE "tournament_weekend"."is_live" = true;--> statement-breakpoint
CREATE INDEX "twm_tournament_round_idx" ON "tournament_weekend_match" USING btree ("tournament_id","round_number");--> statement-breakpoint
CREATE UNIQUE INDEX "twm_match_key_uidx" ON "tournament_weekend_match" USING btree ("tournament_id","round_number","match_key");--> statement-breakpoint
CREATE INDEX "twm_player1_idx" ON "tournament_weekend_match" USING btree ("player_id_1");--> statement-breakpoint
CREATE INDEX "twm_player2_idx" ON "tournament_weekend_match" USING btree ("player_id_2");--> statement-breakpoint
CREATE INDEX "twr_tournament_idx" ON "tournament_weekend_resource" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "twr_user_idx" ON "tournament_weekend_resource" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "twr_approved_idx" ON "tournament_weekend_resource" USING btree ("approved");--> statement-breakpoint
CREATE INDEX "twr_type_idx" ON "tournament_weekend_resource" USING btree ("resource_type");--> statement-breakpoint
CREATE UNIQUE INDEX "twr_resource_uidx" ON "tournament_weekend_resource" USING btree ("tournament_id","resource_type","resource_url");--> statement-breakpoint
CREATE INDEX "twt_weekend_idx" ON "tournament_weekend_tournament" USING btree ("tournament_weekend_id");--> statement-breakpoint
CREATE INDEX "twt_tournament_idx" ON "tournament_weekend_tournament" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "twt_status_idx" ON "tournament_weekend_tournament" USING btree ("status");--> statement-breakpoint
CREATE INDEX "twt_updated_idx" ON "tournament_weekend_tournament" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "twtg_weekend_idx" ON "tournament_weekend_tournament_group" USING btree ("tournament_weekend_id");--> statement-breakpoint
CREATE INDEX "twtg_group_idx" ON "tournament_weekend_tournament_group" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "twtg_format_idx" ON "tournament_weekend_tournament_group" USING btree ("format_id");--> statement-breakpoint
CREATE INDEX "twtg_meta_idx" ON "tournament_weekend_tournament_group" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "er_type_idx" ON "entity_resource" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "er_id_idx" ON "entity_resource" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "er_resource_type_idx" ON "entity_resource" USING btree ("resource_type");