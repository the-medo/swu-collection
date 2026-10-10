-- Custom SQL migration file, put your code below! --
-- Limited decks can receive comments before their first derived-information row.
CREATE OR REPLACE FUNCTION swubase_deck_comment_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO deck_information (deck_id, comments_count)
    VALUES (NEW.deck_id, (SELECT count(*)::integer FROM deck_comment WHERE deck_id = NEW.deck_id))
    ON CONFLICT (deck_id) DO UPDATE
      SET comments_count = deck_information.comments_count + 1;
  ELSE
    UPDATE deck_information SET comments_count = greatest(0, comments_count - 1)
    WHERE deck_id = OLD.deck_id;
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
INSERT INTO deck_information (deck_id, comments_count)
SELECT deck_id, count(*)::integer FROM deck_comment GROUP BY deck_id
ON CONFLICT (deck_id) DO UPDATE SET comments_count = EXCLUDED.comments_count;
