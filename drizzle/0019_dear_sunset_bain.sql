CREATE TABLE "card_stat_tournament_group" (
	"tournament_group_id" uuid NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cstg-pk" PRIMARY KEY("tournament_group_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_tournament_group_leader" (
	"tournament_group_id" uuid NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cstgl-pk" PRIMARY KEY("tournament_group_id","leader_card_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_tournament_group_leader_base" (
	"tournament_group_id" uuid NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"base_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "cstglb-pk" PRIMARY KEY("tournament_group_id","leader_card_id","base_card_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "card_stat_tournament_group" ADD CONSTRAINT "cstg_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_tournament_group_leader" ADD CONSTRAINT "cstgl_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_tournament_group_leader_base" ADD CONSTRAINT "cstglb_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cstg-tournament_group_id_idx" ON "card_stat_tournament_group" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "cstg-card_id_idx" ON "card_stat_tournament_group" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cstgl-tournament_group_id_idx" ON "card_stat_tournament_group_leader" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "cstgl-leader_card_id_idx" ON "card_stat_tournament_group_leader" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "cstgl-card_id_idx" ON "card_stat_tournament_group_leader" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cstglb-tournament_group_id_idx" ON "card_stat_tournament_group_leader_base" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "cstglb-leader_card_id_idx" ON "card_stat_tournament_group_leader_base" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "cstglb-base_card_id_idx" ON "card_stat_tournament_group_leader_base" USING btree ("base_card_id");--> statement-breakpoint
CREATE INDEX "cstglb-card_id_idx" ON "card_stat_tournament_group_leader_base" USING btree ("card_id");