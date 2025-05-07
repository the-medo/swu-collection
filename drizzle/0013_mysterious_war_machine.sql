CREATE TABLE "meta" (
	"id" serial PRIMARY KEY NOT NULL,
	"set" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"format" integer NOT NULL,
	"date" varchar(20) NOT NULL,
	"season" integer NOT NULL
);
--> statement-breakpoint
DROP INDEX "tournament-season_idx";--> statement-breakpoint
DROP INDEX "tournament-set_idx";--> statement-breakpoint
DROP INDEX "tournament-meta_shakeup_idx";--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "meta" integer;--> statement-breakpoint
ALTER TABLE "meta" ADD CONSTRAINT "meta_format_format_id_fk" FOREIGN KEY ("format") REFERENCES "public"."format"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meta-date_idx" ON "meta" USING btree ("date");--> statement-breakpoint
CREATE INDEX "meta-season_idx" ON "meta" USING btree ("season");--> statement-breakpoint
CREATE INDEX "meta-set_idx" ON "meta" USING btree ("set");--> statement-breakpoint
ALTER TABLE "tournament" ADD CONSTRAINT "tournament_meta_meta_id_fk" FOREIGN KEY ("meta") REFERENCES "public"."meta"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tournament-meta_idx" ON "tournament" USING btree ("meta");--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN "season";--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN "set";--> statement-breakpoint
ALTER TABLE "tournament" DROP COLUMN "meta_shakeup";