CREATE TABLE "deck_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deck_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"sealed_by_user_id" text,
	"name" varchar,
	"description" varchar,
	"format" integer,
	"leader_card_id_1" varchar,
	"leader_card_id_2" varchar,
	"base_card_id" varchar,
	"change_note" varchar,
	"content_hash" varchar,
	"source_deck_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sealed_at" timestamp,
	CONSTRAINT "dv_no_check" CHECK ("deck_version"."version_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "deck_version_card" (
	"deck_version_id" uuid NOT NULL,
	"card_id" varchar NOT NULL,
	"board" integer NOT NULL,
	"note" varchar DEFAULT '' NOT NULL,
	"quantity" integer NOT NULL,
	CONSTRAINT "deck_version_card-pk" PRIMARY KEY("deck_version_id","card_id","board"),
	CONSTRAINT "dvc_board_check" CHECK ("deck_version_card"."board" IN (1, 2)),
	CONSTRAINT "dvc_quantity_check" CHECK ("deck_version_card"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "version_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_result" ADD COLUMN "deck_version_id" uuid;--> statement-breakpoint
ALTER TABLE "karabast_lobby_match" ADD COLUMN "deck_version_id" uuid;--> statement-breakpoint
ALTER TABLE "team_member" ADD COLUMN "allow_team_deck_edits" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deck_version" ADD CONSTRAINT "deck_version_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version" ADD CONSTRAINT "deck_version_sealed_by_user_id_user_id_fk" FOREIGN KEY ("sealed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version" ADD CONSTRAINT "deck_version_format_format_id_fk" FOREIGN KEY ("format") REFERENCES "public"."format"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_version_card" ADD CONSTRAINT "deck_version_card_deck_version_id_deck_version_id_fk" FOREIGN KEY ("deck_version_id") REFERENCES "public"."deck_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dv_deck_no_uidx" ON "deck_version" USING btree ("deck_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "dv_open_uidx" ON "deck_version" USING btree ("deck_id") WHERE "deck_version"."sealed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "dv_sealer_idx" ON "deck_version" USING btree ("sealed_by_user_id");--> statement-breakpoint
CREATE INDEX "dvc_card_idx" ON "deck_version_card" USING btree ("card_id");--> statement-breakpoint
ALTER TABLE "game_result" ADD CONSTRAINT "game_result_deck_version_id_deck_version_id_fk" FOREIGN KEY ("deck_version_id") REFERENCES "public"."deck_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karabast_lobby_match" ADD CONSTRAINT "karabast_lobby_match_deck_version_id_deck_version_id_fk" FOREIGN KEY ("deck_version_id") REFERENCES "public"."deck_version"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gr_user_dv_idx" ON "game_result" USING btree ("user_id","deck_version_id");--> statement-breakpoint
CREATE INDEX "klm_dv_idx" ON "karabast_lobby_match" USING btree ("deck_version_id");