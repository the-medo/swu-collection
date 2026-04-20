CREATE TABLE "tournament_weekend_player" (
	"tournament_id" uuid NOT NULL,
	"player_id" integer NOT NULL,
	"leader_card_id" varchar(255),
	"base_card_key" varchar(255),
	"match_score" varchar(20),
	"game_score" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twp_pk" PRIMARY KEY("tournament_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" ADD CONSTRAINT "twp_tournament_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" ADD CONSTRAINT "twp_player_fk" FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "twp_tournament_idx" ON "tournament_weekend_player" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "twp_player_idx" ON "tournament_weekend_player" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "twp_leader_base_idx" ON "tournament_weekend_player" USING btree ("leader_card_id","base_card_key");--> statement-breakpoint
INSERT INTO "tournament_weekend_player" ("tournament_id", "player_id", "leader_card_id", "base_card_key")
SELECT
	"tournament_id",
	"player_id_1",
	MAX("leader_card_id_1"),
	MAX("base_card_key_1")
FROM "tournament_weekend_match"
WHERE "leader_card_id_1" IS NOT NULL OR "base_card_key_1" IS NOT NULL
GROUP BY "tournament_id", "player_id_1"
ON CONFLICT ("tournament_id", "player_id") DO UPDATE SET
	"leader_card_id" = COALESCE(EXCLUDED."leader_card_id", "tournament_weekend_player"."leader_card_id"),
	"base_card_key" = COALESCE(EXCLUDED."base_card_key", "tournament_weekend_player"."base_card_key"),
	"updated_at" = NOW();--> statement-breakpoint
INSERT INTO "tournament_weekend_player" ("tournament_id", "player_id", "leader_card_id", "base_card_key")
SELECT
	"tournament_id",
	"player_id_2",
	MAX("leader_card_id_2"),
	MAX("base_card_key_2")
FROM "tournament_weekend_match"
WHERE "player_id_2" IS NOT NULL AND ("leader_card_id_2" IS NOT NULL OR "base_card_key_2" IS NOT NULL)
GROUP BY "tournament_id", "player_id_2"
ON CONFLICT ("tournament_id", "player_id") DO UPDATE SET
	"leader_card_id" = COALESCE(EXCLUDED."leader_card_id", "tournament_weekend_player"."leader_card_id"),
	"base_card_key" = COALESCE(EXCLUDED."base_card_key", "tournament_weekend_player"."base_card_key"),
	"updated_at" = NOW();--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "leader_card_id_1";--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "base_card_key_1";--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "leader_card_id_2";--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "base_card_key_2";
