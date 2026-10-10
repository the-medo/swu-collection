CREATE TABLE "deck_discussion" (
	"deck_id" uuid PRIMARY KEY NOT NULL,
	"discussion_id" uuid NOT NULL,
	CONSTRAINT "deck_discussion_discussion_id_unique" UNIQUE("discussion_id")
);
--> statement-breakpoint
CREATE TABLE "discussion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discussion_comment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" uuid NOT NULL,
	"parent_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"author_id" text,
	"content" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discussion_comment_depth_check" CHECK ("discussion_comment"."depth" BETWEEN 0 AND 5)
);
--> statement-breakpoint
ALTER TABLE "deck_discussion" ADD CONSTRAINT "deck_discussion_deck_id_deck_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."deck"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deck_discussion" ADD CONSTRAINT "deck_discussion_discussion_id_discussion_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_discussion_id_discussion_id_fk" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "discussion_comment_discussion_id_idx" ON "discussion_comment" USING btree ("discussion_id","id");--> statement-breakpoint
ALTER TABLE "discussion_comment" ADD CONSTRAINT "discussion_comment_parent_fk" FOREIGN KEY ("discussion_id","parent_id") REFERENCES "public"."discussion_comment"("discussion_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_comment_thread_created_idx" ON "discussion_comment" USING btree ("discussion_id","parent_id","created_at","id");--> statement-breakpoint
CREATE INDEX "discussion_comment_author_idx" ON "discussion_comment" USING btree ("author_id");
--> statement-breakpoint
-- Preserve comment identifiers, revisions, timestamps and prose. Existing decks
-- use their UUID for the initial discussion; future discussions have their own UUID.
INSERT INTO discussion (id) SELECT id FROM deck;
--> statement-breakpoint
INSERT INTO deck_discussion (deck_id, discussion_id) SELECT id, id FROM deck;
--> statement-breakpoint
INSERT INTO discussion_comment (id, discussion_id, author_id, content, revision, created_at, updated_at)
SELECT id, deck_id, author_id, content, revision, created_at, updated_at FROM deck_comment;
--> statement-breakpoint
DROP TABLE deck_comment;
--> statement-breakpoint
DROP FUNCTION swubase_deck_comment_count();
--> statement-breakpoint
CREATE FUNCTION swubase_create_deck_discussion() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE discussion_uuid uuid;
BEGIN
  INSERT INTO discussion DEFAULT VALUES RETURNING id INTO discussion_uuid;
  INSERT INTO deck_discussion (deck_id, discussion_id) VALUES (NEW.id, discussion_uuid);
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER deck_discussion_create AFTER INSERT ON deck
FOR EACH ROW EXECUTE FUNCTION swubase_create_deck_discussion();
--> statement-breakpoint
CREATE FUNCTION swubase_delete_deck_discussion() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM discussion WHERE id = OLD.discussion_id;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER deck_discussion_delete AFTER DELETE ON deck_discussion
FOR EACH ROW EXECUTE FUNCTION swubase_delete_deck_discussion();
--> statement-breakpoint
-- Account removal retains the thread but erases the author's personal prose.
-- Manual deletion uses the same tombstone representation.
CREATE FUNCTION swubase_clear_deleted_comment() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.author_id IS NULL OR NEW.deleted_at IS NOT NULL THEN
    NEW.content = jsonb_build_object('version', 1, 'blocks', jsonb_build_array(
      jsonb_build_object('id', gen_random_uuid()::text, 'type', 'paragraph',
        'props', '{}'::jsonb, 'content', '[]'::jsonb, 'children', '[]'::jsonb)));
    NEW.author_id = NULL;
    NEW.deleted_at = coalesce(NEW.deleted_at, now());
    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.revision = OLD.revision THEN
      NEW.revision = OLD.revision + 1;
      NEW.updated_at = now();
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER discussion_comment_clear BEFORE INSERT OR UPDATE ON discussion_comment
FOR EACH ROW EXECUTE FUNCTION swubase_clear_deleted_comment();
--> statement-breakpoint
CREATE FUNCTION swubase_discussion_comment_count() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE delta integer; discussion_uuid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta = CASE WHEN NEW.deleted_at IS NULL THEN 1 ELSE 0 END;
    discussion_uuid = NEW.discussion_id;
  ELSIF TG_OP = 'DELETE' THEN
    delta = CASE WHEN OLD.deleted_at IS NULL THEN -1 ELSE 0 END;
    discussion_uuid = OLD.discussion_id;
  ELSE
    delta = (CASE WHEN NEW.deleted_at IS NULL THEN 1 ELSE 0 END)
      - (CASE WHEN OLD.deleted_at IS NULL THEN 1 ELSE 0 END);
    discussion_uuid = NEW.discussion_id;
  END IF;
  IF delta <> 0 THEN
    UPDATE deck_information SET comments_count = greatest(0, comments_count + delta)
    WHERE deck_id = (SELECT deck_id FROM deck_discussion WHERE discussion_id = discussion_uuid);
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER discussion_comment_count AFTER INSERT OR DELETE OR UPDATE OF deleted_at ON discussion_comment
FOR EACH ROW EXECUTE FUNCTION swubase_discussion_comment_count();
--> statement-breakpoint
UPDATE deck_information di SET comments_count = (
  SELECT count(*)::integer FROM discussion_comment c JOIN deck_discussion d ON d.discussion_id = c.discussion_id
  WHERE d.deck_id = di.deck_id AND c.deleted_at IS NULL);
