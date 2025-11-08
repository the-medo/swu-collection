CREATE TYPE "public"."card_pool_deck_card_location" AS ENUM('pool', 'deck', 'trash');--> statement-breakpoint
CREATE TYPE "public"."card_pool_type" AS ENUM('prerelease', 'sealed', 'draft');--> statement-breakpoint
CREATE TYPE "public"."pool_status" AS ENUM('in_progress', 'ready');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'unlisted', 'public');--> statement-breakpoint
CREATE TABLE "card_pool_deck_cards" (
	"deck_id" uuid NOT NULL,
	"card_pool_number" integer NOT NULL,
	"location" "card_pool_deck_card_location" NOT NULL,
	CONSTRAINT "card_pool_deck_cards_deck_id_card_pool_number_pk" PRIMARY KEY("deck_id","card_pool_number")
);
--> statement-breakpoint
CREATE TABLE "card_pool_decks" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"card_pool_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"visibility" "visibility"
);
--> statement-breakpoint
CREATE TABLE "card_pool_cards" (
	"card_pool_id" uuid NOT NULL,
	"card_pool_number" integer NOT NULL,
	"card_id" text NOT NULL,
	CONSTRAINT "card_pool_cards_card_pool_id_card_pool_number_pk" PRIMARY KEY("card_pool_id","card_pool_number")
);
--> statement-breakpoint
CREATE TABLE "card_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set" text,
	"user_id" text,
	"type" "card_pool_type",
	"name" text,
	"description" text,
	"leaders" text,
	"edited" boolean DEFAULT false NOT NULL,
	"custom" boolean DEFAULT false NOT NULL,
	"status" "pool_status",
	"visibility" "visibility",
	"archived_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck" ADD COLUMN "card_pool_id" uuid;--> statement-breakpoint
ALTER TABLE "card_pool_deck_cards" ADD CONSTRAINT "card_pool_deck_cards_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_pool_decks" ADD CONSTRAINT "card_pool_decks_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_pool_decks" ADD CONSTRAINT "card_pool_decks_card_pool_id_card_pools_id_fk" FOREIGN KEY ("card_pool_id") REFERENCES "public"."card_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_pool_decks" ADD CONSTRAINT "card_pool_decks_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_pool_cards" ADD CONSTRAINT "card_pool_cards_card_pool_id_card_pools_id_fk" FOREIGN KEY ("card_pool_id") REFERENCES "public"."card_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_pools" ADD CONSTRAINT "card_pools_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cpdc-deck_idx" ON "card_pool_deck_cards" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "cpdc-num_idx" ON "card_pool_deck_cards" USING btree ("card_pool_number");--> statement-breakpoint
CREATE INDEX "cpdc-loc_idx" ON "card_pool_deck_cards" USING btree ("location");--> statement-breakpoint
CREATE INDEX "cpd-deck_idx" ON "card_pool_decks" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "cpd-pool_idx" ON "card_pool_decks" USING btree ("card_pool_id");--> statement-breakpoint
CREATE INDEX "cpd-user_idx" ON "card_pool_decks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cpd-vis_idx" ON "card_pool_decks" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "cp-set_idx" ON "card_pools" USING btree ("set");--> statement-breakpoint
CREATE INDEX "cp-user_idx" ON "card_pools" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cp-type_idx" ON "card_pools" USING btree ("type");--> statement-breakpoint
CREATE INDEX "cp-status_idx" ON "card_pools" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cp-vis_idx" ON "card_pools" USING btree ("visibility");--> statement-breakpoint
CREATE INDEX "cp-created_idx" ON "card_pools" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cp-updated_idx" ON "card_pools" USING btree ("updated_at");--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_card_pool_id_card_pools_id_fk" FOREIGN KEY ("card_pool_id") REFERENCES "public"."card_pools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck-card_pool_id_idx" ON "deck" USING btree ("card_pool_id");