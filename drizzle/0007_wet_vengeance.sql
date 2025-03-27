ALTER TABLE "collection" ADD COLUMN "collection_type" integer NOT NULL DEFAULT 1;--> statement-breakpoint
UPDATE "collection" SET collection_type = CASE WHEN wantlist = true THEN 2 ELSE 1 END;
ALTER TABLE "collection" DROP COLUMN "wantlist";