-- Existing discussions were created only for decks. The temporary default
-- backfills them without rewriting comment/guide contents; new callers must
-- choose a type explicitly.
ALTER TABLE "discussion" ADD COLUMN "type" text DEFAULT 'deck' NOT NULL;--> statement-breakpoint
ALTER TABLE "discussion" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
CREATE OR REPLACE FUNCTION swubase_create_deck_discussion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE discussion_uuid uuid;
BEGIN
  INSERT INTO discussion (type) VALUES ('deck') RETURNING id INTO discussion_uuid;
  INSERT INTO deck_discussion (deck_id, discussion_id) VALUES (NEW.id, discussion_uuid);
  RETURN NEW;
END;
$$;
