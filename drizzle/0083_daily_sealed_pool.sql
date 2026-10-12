CREATE TABLE "daily_pool_discussion" (
	"card_pool_id" uuid PRIMARY KEY NOT NULL,
	"discussion_id" uuid NOT NULL,
	CONSTRAINT "daily_pool_discussion_discussion_id_unique" UNIQUE("discussion_id")
);
--> statement-breakpoint
ALTER TABLE "card_pools" ADD COLUMN "daily_date" date;--> statement-breakpoint
ALTER TABLE "daily_pool_discussion" ADD CONSTRAINT "daily_pool_discussion_card_pool_id_card_pools_id_fk" FOREIGN KEY ("card_pool_id") REFERENCES "public"."card_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_pool_discussion" ADD CONSTRAINT "daily_pool_discussion_discussion_id_discussion_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cp-daily_date_unique" ON "card_pools" USING btree ("daily_date");
--> statement-breakpoint
-- Serialize backfill with pool creation; daily_date is the daily challenge identity.
LOCK TABLE card_pools IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
DO $$
DECLARE pool record; discussion_uuid uuid;
BEGIN
  FOR pool IN SELECT id FROM card_pools WHERE daily_date IS NOT NULL LOOP
    INSERT INTO discussion (type) VALUES ('daily-pool') RETURNING id INTO discussion_uuid;
    INSERT INTO daily_pool_discussion (card_pool_id, discussion_id) VALUES (pool.id, discussion_uuid);
  END LOOP;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION swubase_create_daily_pool_discussion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE discussion_uuid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM daily_pool_discussion WHERE card_pool_id = NEW.id) THEN
    INSERT INTO discussion (type) VALUES ('daily-pool') RETURNING id INTO discussion_uuid;
    INSERT INTO daily_pool_discussion (card_pool_id, discussion_id) VALUES (NEW.id, discussion_uuid);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER daily_pool_discussion_create AFTER INSERT OR UPDATE OF daily_date ON card_pools
FOR EACH ROW WHEN (NEW.daily_date IS NOT NULL) EXECUTE FUNCTION swubase_create_daily_pool_discussion();
--> statement-breakpoint
CREATE FUNCTION swubase_delete_daily_pool_discussion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM discussion WHERE id = OLD.discussion_id;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER daily_pool_discussion_delete AFTER DELETE ON daily_pool_discussion
FOR EACH ROW EXECUTE FUNCTION swubase_delete_daily_pool_discussion();
