ALTER TABLE "deck_folder" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, (row_number() OVER (PARTITION BY user_id, parent_id ORDER BY name, id) - 1)::integer AS position
  FROM deck_folder
)
UPDATE deck_folder
SET position = ranked.position
FROM ranked
WHERE deck_folder.id = ranked.id;
