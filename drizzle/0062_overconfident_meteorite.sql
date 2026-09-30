ALTER TABLE "tournament" ADD COLUMN "coordinates" "point";--> statement-breakpoint
ALTER TABLE "tournament" ADD COLUMN "additional_info" jsonb DEFAULT '{}'::jsonb NOT NULL;