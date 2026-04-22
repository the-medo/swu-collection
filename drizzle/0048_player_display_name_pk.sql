ALTER TABLE "player_watch" DROP CONSTRAINT "pw_player_fk";
--> statement-breakpoint
ALTER TABLE "player_watch" DROP CONSTRAINT "pw_pk";
--> statement-breakpoint
ALTER TABLE "tournament_standing" DROP CONSTRAINT "ts_player_fk";
--> statement-breakpoint
ALTER TABLE "tournament_standing" DROP CONSTRAINT "ts_pk";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP CONSTRAINT "twm_player1_fk";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP CONSTRAINT "twm_player2_fk";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" DROP CONSTRAINT "twp_player_fk";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" DROP CONSTRAINT "twp_pk";
--> statement-breakpoint
ALTER TABLE "player" DROP CONSTRAINT "player_pkey";
--> statement-breakpoint
DROP INDEX IF EXISTS "player_display_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "ts_player_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "twm_player1_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "twm_player2_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "twp_player_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "pw_player_idx";
--> statement-breakpoint
ALTER TABLE "player_watch" DROP COLUMN "player_id";
--> statement-breakpoint
ALTER TABLE "player_watch" ADD COLUMN "player_display_name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournament_standing" DROP COLUMN "player_id";
--> statement-breakpoint
ALTER TABLE "tournament_standing" ADD COLUMN "player_display_name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "player_id_1";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" DROP COLUMN "player_id_2";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD COLUMN "player_display_name_1" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD COLUMN "player_display_name_2" varchar(255);
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" DROP COLUMN "player_id";
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" ADD COLUMN "player_display_name" varchar(255) NOT NULL;
--> statement-breakpoint
ALTER TABLE "player" DROP COLUMN "id";
--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_pkey" PRIMARY KEY ("display_name");
--> statement-breakpoint
ALTER TABLE "player_watch" ADD CONSTRAINT "pw_pk" PRIMARY KEY ("user_id","player_display_name");
--> statement-breakpoint
ALTER TABLE "tournament_standing" ADD CONSTRAINT "ts_pk" PRIMARY KEY ("tournament_id","round_number","player_display_name");
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" ADD CONSTRAINT "twp_pk" PRIMARY KEY ("tournament_id","player_display_name");
--> statement-breakpoint
CREATE INDEX "ts_player_idx" ON "tournament_standing" USING btree ("player_display_name");
--> statement-breakpoint
CREATE INDEX "twm_player1_idx" ON "tournament_weekend_match" USING btree ("player_display_name_1");
--> statement-breakpoint
CREATE INDEX "twm_player2_idx" ON "tournament_weekend_match" USING btree ("player_display_name_2");
--> statement-breakpoint
CREATE INDEX "twp_player_idx" ON "tournament_weekend_player" USING btree ("player_display_name");
--> statement-breakpoint
CREATE INDEX "pw_player_idx" ON "player_watch" USING btree ("player_display_name");
--> statement-breakpoint
ALTER TABLE "tournament_standing" ADD CONSTRAINT "ts_player_fk" FOREIGN KEY ("player_display_name") REFERENCES "public"."player"("display_name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD CONSTRAINT "twm_player1_fk" FOREIGN KEY ("player_display_name_1") REFERENCES "public"."player"("display_name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_weekend_match" ADD CONSTRAINT "twm_player2_fk" FOREIGN KEY ("player_display_name_2") REFERENCES "public"."player"("display_name") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tournament_weekend_player" ADD CONSTRAINT "twp_player_fk" FOREIGN KEY ("player_display_name") REFERENCES "public"."player"("display_name") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "player_watch" ADD CONSTRAINT "pw_player_fk" FOREIGN KEY ("player_display_name") REFERENCES "public"."player"("display_name") ON DELETE cascade ON UPDATE no action;
