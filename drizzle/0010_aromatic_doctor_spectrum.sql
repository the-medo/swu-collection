ALTER TABLE "tournament" ADD COLUMN "season" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "set" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "meta_shakeup" varchar;--> statement-breakpoint
CREATE INDEX "tournament-season_idx" ON "tournament" USING btree ("season");--> statement-breakpoint
CREATE INDEX "tournament-set_idx" ON "tournament" USING btree ("set");--> statement-breakpoint
CREATE INDEX "tournament-meta_shakeup_idx" ON "tournament" USING btree ("meta_shakeup");