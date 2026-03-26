CREATE TABLE "karabast_lobby_match" (
	"match_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"lobby_id" text NOT NULL,
	"deck_id" uuid,
	"opponent_leader_card_id" text,
	"opponent_base_card_key" text,
	"lookup_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "karabast_lobby_match_pkey" PRIMARY KEY("match_id","user_id"),
	CONSTRAINT "karabast_lobby_match_lookup_key_unique" UNIQUE("lookup_key")
);
--> statement-breakpoint
ALTER TABLE "karabast_lobby_match" ADD CONSTRAINT "karabast_lobby_match_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karabast_lobby_match" ADD CONSTRAINT "karabast_lobby_match_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_karabast_lobby_match_lobby_id" ON "karabast_lobby_match" USING btree ("lobby_id");--> statement-breakpoint
CREATE INDEX "idx_karabast_lobby_match_lobby_user" ON "karabast_lobby_match" USING btree ("lobby_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_karabast_lobby_match_match_id" ON "karabast_lobby_match" USING btree ("match_id");