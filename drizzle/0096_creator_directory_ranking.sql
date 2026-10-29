ALTER TABLE "creator_profile" ADD COLUMN "follower_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "subscriber_count" bigint;--> statement-breakpoint
ALTER TABLE "creator_youtube_channel" ADD COLUMN "subscribers_updated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "creator_profile_followers" ON "creator_profile" USING btree ("follower_count" DESC NULLS LAST,"slug");--> statement-breakpoint
ALTER TABLE "creator_profile" ADD CONSTRAINT "creator_profile_followers_nonnegative" CHECK ("creator_profile"."follower_count" >= 0);
--> statement-breakpoint
-- Backfill and install the counter atomically, including followers removed by
-- account deletion. Idempotent INSERT ... ON CONFLICT does not fire this trigger.
LOCK TABLE creator_follow IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
UPDATE creator_profile AS profile
SET follower_count = (
  SELECT count(*)::integer FROM creator_follow WHERE creator_id = profile.id
);
--> statement-breakpoint
CREATE FUNCTION swubase_creator_follower_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    UPDATE creator_profile SET follower_count = 0 WHERE follower_count <> 0;
  ELSIF TG_OP = 'INSERT' THEN
    UPDATE creator_profile SET follower_count = follower_count + 1 WHERE id = NEW.creator_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE creator_profile SET follower_count = follower_count - 1 WHERE id = OLD.creator_id;
  ELSIF OLD.creator_id IS DISTINCT FROM NEW.creator_id THEN
    -- Keep a stable lock order when moving an association between profiles.
    PERFORM id FROM creator_profile WHERE id IN (OLD.creator_id, NEW.creator_id)
      ORDER BY id FOR NO KEY UPDATE;
    UPDATE creator_profile
      SET follower_count = follower_count + CASE WHEN id = NEW.creator_id THEN 1 ELSE -1 END
      WHERE id IN (OLD.creator_id, NEW.creator_id);
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER creator_follower_count
AFTER INSERT OR DELETE OR UPDATE OF creator_id ON creator_follow
FOR EACH ROW EXECUTE FUNCTION swubase_creator_follower_count();
--> statement-breakpoint
CREATE TRIGGER creator_follower_count_truncate
AFTER TRUNCATE ON creator_follow
FOR EACH STATEMENT EXECUTE FUNCTION swubase_creator_follower_count();
