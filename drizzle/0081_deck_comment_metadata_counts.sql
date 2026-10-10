-- Custom SQL migration file, put your code below! --
-- Comments must not create incomplete derived metadata or change deck-list membership.
-- Metadata creation initializes the count under the same deck lock as discussion writes.
CREATE OR REPLACE FUNCTION swubase_deck_comment_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE deck_information SET comments_count = comments_count + 1
    WHERE deck_id = NEW.deck_id;
  ELSE
    UPDATE deck_information SET comments_count = greatest(0, comments_count - 1)
    WHERE deck_id = OLD.deck_id;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
UPDATE deck_information di
SET comments_count = (SELECT count(*)::integer FROM deck_comment c WHERE c.deck_id = di.deck_id);
