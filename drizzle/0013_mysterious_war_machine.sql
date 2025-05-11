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

-- -- -- simple seeding of meta table
INSERT INTO meta (id, set, name, format, date, season)
VALUES
    (1, 'jtl','JTL - set release',1,'2025-03-14',0),
    (2, 'jtl','JTL - Jango, TDR and DJ bans',1,'2025-04-11',0),
    (3, 'jtl','JTL - set release',2,'2025-03-14',0),
    (4, 'jtl','JTL - set release',3,'2025-03-14',0),
    (5, 'jtl','JTL - set release',4,'2025-03-14',0),
    (6, 'jtl','JTL - set release',5,'2025-03-14',0)
ON CONFLICT (id)
    DO UPDATE SET
      set = EXCLUDED.set,
      name = EXCLUDED.name,
      format = EXCLUDED.format,
      date = EXCLUDED.date,
      season = EXCLUDED.season;


-- Update tournament meta based on format and date
UPDATE tournament t
SET meta = (
    -- Subquery to find the most recent meta for the tournament's format
    -- that is valid (meta.date <= tournament.date)
    SELECT m.id
    FROM meta m
    WHERE m.format = t.format  -- Match the format
      AND m.date::date <= t.date     -- Meta must be valid on or before the tournament date
    ORDER BY m.date DESC       -- Get the most recent meta
    LIMIT 1
)
WHERE t.meta IS NULL;