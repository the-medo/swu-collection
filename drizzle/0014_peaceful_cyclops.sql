CREATE TABLE "card_stat_meta" (
	"meta_id" integer NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_meta__pk" PRIMARY KEY("meta_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_meta_leader" (
	"meta_id" integer NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_meta_leader__pk" PRIMARY KEY("meta_id","leader_card_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_meta_leader_base" (
	"meta_id" integer NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"base_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_meta_leader_base__pk" PRIMARY KEY("meta_id","leader_card_id","base_card_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_tournament" (
	"tournament_id" uuid NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_tournament__pk" PRIMARY KEY("tournament_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_tournament_leader" (
	"tournament_id" uuid NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_tournament_leader__pk" PRIMARY KEY("tournament_id","leader_card_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_stat_tournament_leader_base" (
	"tournament_id" uuid NOT NULL,
	"leader_card_id" varchar NOT NULL,
	"base_card_id" varchar NOT NULL,
	"card_id" varchar NOT NULL,
	"count_md" integer DEFAULT 0 NOT NULL,
	"count_sb" integer DEFAULT 0 NOT NULL,
	"deck_count" integer DEFAULT 0 NOT NULL,
	"match_win" integer DEFAULT 0 NOT NULL,
	"match_lose" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "card_stat_tournament_leader_base__pk" PRIMARY KEY("tournament_id","leader_card_id","base_card_id","card_id")
);
--> statement-breakpoint
ALTER TABLE "card_stat_meta" ADD CONSTRAINT "card_stat_meta_meta_id_meta_id_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."meta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_meta_leader" ADD CONSTRAINT "card_stat_meta_leader_meta_id_meta_id_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."meta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_meta_leader_base" ADD CONSTRAINT "card_stat_meta_leader_base_meta_id_meta_id_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."meta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_tournament" ADD CONSTRAINT "card_stat_tournament_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_tournament_leader" ADD CONSTRAINT "card_stat_tournament_leader_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_stat_tournament_leader_base" ADD CONSTRAINT "card_stat_tournament_leader_base_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "csm-meta_id_idx" ON "card_stat_meta" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "csm-card_id_idx" ON "card_stat_meta" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "csml-meta_id_idx" ON "card_stat_meta_leader" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "csml-leader_card_id_idx" ON "card_stat_meta_leader" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "csml-card_id_idx" ON "card_stat_meta_leader" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "csmlb-meta_id_idx" ON "card_stat_meta_leader_base" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "csmlb-leader_card_id_idx" ON "card_stat_meta_leader_base" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "csmlb-base_card_id_idx" ON "card_stat_meta_leader_base" USING btree ("base_card_id");--> statement-breakpoint
CREATE INDEX "csmlb-card_id_idx" ON "card_stat_meta_leader_base" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cst-tournament_id_idx" ON "card_stat_tournament" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "cst-card_id_idx" ON "card_stat_tournament" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cstl-tournament_id_idx" ON "card_stat_tournament_leader" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "cstl-leader_card_id_idx" ON "card_stat_tournament_leader" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "cstl-card_id_idx" ON "card_stat_tournament_leader" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "cstlb-tournament_id_idx" ON "card_stat_tournament_leader_base" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "cstlb-leader_card_id_idx" ON "card_stat_tournament_leader_base" USING btree ("leader_card_id");--> statement-breakpoint
CREATE INDEX "cstlb-base_card_id_idx" ON "card_stat_tournament_leader_base" USING btree ("base_card_id");--> statement-breakpoint
CREATE INDEX "cstlb-card_id_idx" ON "card_stat_tournament_leader_base" USING btree ("card_id");