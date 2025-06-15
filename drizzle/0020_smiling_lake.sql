CREATE TABLE "tournament_group_leader_base" (
	"tournament_group_id" uuid NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"base_card_id" varchar NOT NULL,
	"winner" integer DEFAULT 0 NOT NULL,
	"top8" integer DEFAULT 0 NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tglb-pk" PRIMARY KEY("tournament_group_id","leader_card_id","base_card_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_group_stats" (
	"tournament_group_id" uuid NOT NULL,
	"imported_tournaments" integer DEFAULT 0 NOT NULL,
	"total_tournaments" integer DEFAULT 0 NOT NULL,
	"attendance" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tgs-pk" PRIMARY KEY("tournament_group_id")
);
--> statement-breakpoint
ALTER TABLE "tournament_group_leader_base" ADD CONSTRAINT "tglb_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_group_stats" ADD CONSTRAINT "tgs_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tglb-tournament_group_id_idx" ON "tournament_group_leader_base" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "tglb-leader_card_id_idx" ON "tournament_group_leader_base" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "tglb-base_card_id_idx" ON "tournament_group_leader_base" USING btree ("base_card_id");--> statement-breakpoint
CREATE INDEX "tgs-tournament_group_id_idx" ON "tournament_group_stats" USING btree ("tournament_group_id");