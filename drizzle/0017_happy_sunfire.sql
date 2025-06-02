CREATE TABLE "tournament_group_tournament" (
	"tournament_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "tournament_group_tournament_tournament_id_group_id_pk" PRIMARY KEY("tournament_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"meta_id" integer,
	"position" integer DEFAULT 0 NOT NULL,
	"description" text,
	"visible" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tournament_group_tournament" ADD CONSTRAINT "tournament_group_tournament_tournament_id_tournament_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournament"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_group_tournament" ADD CONSTRAINT "tournament_group_tournament_group_id_tournament_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_group" ADD CONSTRAINT "tournament_group_meta_id_meta_id_fk" FOREIGN KEY ("meta_id") REFERENCES "public"."meta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournament_group_tournament-tournament_idx" ON "tournament_group_tournament" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "tournament_group_tournament-group_idx" ON "tournament_group_tournament" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "tournament_group_tournament-position_idx" ON "tournament_group_tournament" USING btree ("position");--> statement-breakpoint
CREATE INDEX "tournament_group-meta_idx" ON "tournament_group" USING btree ("meta_id");--> statement-breakpoint
CREATE INDEX "tournament_group-position_idx" ON "tournament_group" USING btree ("position");