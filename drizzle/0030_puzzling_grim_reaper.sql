ALTER TABLE "collection" ADD COLUMN "for_sale" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "for_decks" boolean DEFAULT false NOT NULL;

UPDATE "collection" SET "for_decks" = true WHERE "collection_type" = 1; -- set "for_decks" to true for collections only