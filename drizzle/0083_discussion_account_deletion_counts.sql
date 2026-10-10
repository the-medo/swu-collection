-- Account deletion updates author_id through SET NULL; the BEFORE trigger also
-- sets deleted_at. An UPDATE OF deleted_at trigger misses that indirect change.
DROP TRIGGER discussion_comment_count ON discussion_comment;
--> statement-breakpoint
CREATE TRIGGER discussion_comment_count AFTER INSERT OR DELETE OR UPDATE ON discussion_comment
FOR EACH ROW EXECUTE FUNCTION swubase_discussion_comment_count();
--> statement-breakpoint
UPDATE deck_information di SET comments_count = (
  SELECT count(*)::integer FROM discussion_comment c JOIN deck_discussion d ON d.discussion_id = c.discussion_id
  WHERE d.deck_id = di.deck_id AND c.deleted_at IS NULL);
