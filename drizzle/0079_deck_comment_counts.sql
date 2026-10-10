-- Custom SQL migration file, put your code below! --
-- Keep the existing deck list counter consistent, including cascaded author
-- deletion. TRUNCATE is handled explicitly by the contributor-data sanitizer.
CREATE FUNCTION swubase_deck_comment_count() RETURNS trigger
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
CREATE TRIGGER deck_comment_count
AFTER INSERT OR DELETE ON deck_comment
FOR EACH ROW EXECUTE FUNCTION swubase_deck_comment_count();
--> statement-breakpoint
UPDATE deck_information di
SET comments_count = (SELECT count(*) FROM deck_comment c WHERE c.deck_id = di.deck_id);
