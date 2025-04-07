CREATE TABLE "entity_resource" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_url" text NOT NULL,
	"title" varchar(255),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_deck" (
	"tournament_id" uuid NOT NULL,
	"deck_id" uuid NOT NULL,
	"placement" integer,
	"top_relative_to_player_count" boolean NOT NULL,
	"record_win" integer NOT NULL,
	"record_lose" integer NOT NULL,
	"record_draw" integer NOT NULL,
	"points" integer NOT NULL,
	"melee_decklist_guid" varchar(255),
	"melee_player_username" varchar(255),
	CONSTRAINT "tournament_deck_tournament_id_deck_id_pk" PRIMARY KEY("tournament_id","deck_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" uuid NOT NULL,
	"round" integer NOT NULL,
	"p1_username" varchar(255) NOT NULL,
	"p1_deck_id" uuid NOT NULL,
	"p1_points" integer NOT NULL,
	"p2_username" varchar(255),
	"p2_deck_id" uuid,
	"p2_points" integer,
	"game_win" integer NOT NULL,
	"game_lose" integer NOT NULL,
	"game_draw" integer NOT NULL,
	"result" integer NOT NULL,
	"bye" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_type" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"sort_value" integer NOT NULL,
	"major" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"location" varchar(255) NOT NULL,
	"continent" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"attendance" integer NOT NULL,
	"melee_id" varchar(255),
	"format" integer NOT NULL,
	"days" integer NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_deck" ADD CONSTRAINT "tournament_deck_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_deck" ADD CONSTRAINT "tournament_deck_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_match" ADD CONSTRAINT "tournament_match_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_match" ADD CONSTRAINT "tournament_match_p1_deck_id_deck_id_fk" FOREIGN KEY ("p1_deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_match" ADD CONSTRAINT "tournament_match_p2_deck_id_deck_id_fk" FOREIGN KEY ("p2_deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_type_tournament_type_id_fk" FOREIGN KEY ("type") REFERENCES "public"."tournament_type"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_format_format_id_fk" FOREIGN KEY ("format") REFERENCES "public"."format"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entity_resource_entity_idx" ON "entity_resource" USING btree ("entity_type","entity_id","resource_type","resource_url");--> statement-breakpoint
CREATE INDEX "tournament_match-round_idx" ON "tournament_match" USING btree ("round");--> statement-breakpoint
CREATE INDEX "tournament_match-username1_idx" ON "tournament_match" USING btree ("p1_username");--> statement-breakpoint
CREATE INDEX "tournament_match-username2_idx" ON "tournament_match" USING btree ("p2_username");--> statement-breakpoint
CREATE INDEX "tournament-date_idx" ON "tournament" USING btree ("date");


INSERT INTO tournament_type (id, name, sort_value, major)
VALUES
    ('local', 'LGS tournament', 10, 0),
    ('showdown', 'Store Showdown', 100, 0),
    ('ma1', '1-day Major Tournament', 150, 1),
    ('pq', 'Planetary Qualifier', 200, 1),
    ('ma2', '2-day Major Tournament', 250, 1),
    ('sq', 'Sector Qualifier', 300, 1),
    ('rq', 'Regional Qualifier', 400, 1),
    ('gc', 'Galactic Championship', 500, 1)
ON CONFLICT (id)
    DO UPDATE SET
      name = EXCLUDED.name,
      sort_value = EXCLUDED.sort_value,
      major = EXCLUDED.major;


INSERT INTO "user" (id, name, email, email_verified, image, display_name, created_at, updated_at, currency)
    VALUES ('swubase', 'swubase', 'info@swubase.com', true, 'https://images.swubase.com/discord-logo.png', 'swubase', now(), now(), 'USD')
