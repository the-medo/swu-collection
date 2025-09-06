CREATE TABLE "daily_snapshot" (
	"date" date PRIMARY KEY NOT NULL,
	"tournament_group_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_snapshot_section" (
	"date" date NOT NULL,
	"section" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"data" text NOT NULL,
	CONSTRAINT "daily_snapshot_section_date_section_pk" PRIMARY KEY("date","section")
);
--> statement-breakpoint
ALTER TABLE "daily_snapshot" ADD CONSTRAINT "ds_tournament_group_fk" FOREIGN KEY ("tournament_group_id") REFERENCES "public"."tournament_group"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ds-tournament_group_id_idx" ON "daily_snapshot" USING btree ("tournament_group_id");--> statement-breakpoint
CREATE INDEX "dss-date_idx" ON "daily_snapshot_section" USING btree ("date");--> statement-breakpoint
CREATE INDEX "dss-section_idx" ON "daily_snapshot_section" USING btree ("section");