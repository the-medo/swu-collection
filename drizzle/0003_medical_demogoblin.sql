CREATE TABLE "deck_card" (
	"deck_id" text NOT NULL,
	"card_id" uuid NOT NULL,
	"board" integer DEFAULT 1 NOT NULL,
	"note" varchar DEFAULT '' NOT NULL,
	CONSTRAINT "deck_card-pk" PRIMARY KEY("deck_id","card_id","board")
);
--> statement-breakpoint
CREATE TABLE "deck" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"format" integer NOT NULL,
	"name" varchar DEFAULT '' NOT NULL,
	"description" varchar DEFAULT '' NOT NULL,
	"leader_card_id_1" varchar,
	"leader_card_id_2" varchar,
	"base_card_id" varchar,
	"public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deck_card" ADD CONSTRAINT "deck_card_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck" ADD CONSTRAINT "deck_format_format_id_fk" FOREIGN KEY ("format") REFERENCES "public"."format"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deck_card-deck_id_idx" ON "deck_card" USING btree ("deck_id");--> statement-breakpoint
CREATE INDEX "deck_card-card_id_idx" ON "deck_card" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "deck-user_id_idx" ON "deck" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "deck-format_idx" ON "deck" USING btree ("format");--> statement-breakpoint
CREATE INDEX "deck-name_idx" ON "deck" USING btree ("leader_card_id_1");--> statement-breakpoint
CREATE INDEX "deck-leader_card_id_1_idx" ON "deck" USING btree ("leader_card_id_1");--> statement-breakpoint
CREATE INDEX "deck-leader_card_id_2_idx" ON "deck" USING btree ("leader_card_id_2");--> statement-breakpoint
CREATE INDEX "deck-base_card_id_idx" ON "deck" USING btree ("base_card_id");--> statement-breakpoint
CREATE INDEX "deck-created_at_idx" ON "deck" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deck-updated_at_idx" ON "deck" USING btree ("updated_at");