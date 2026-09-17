ALTER TABLE "game_result" ADD COLUMN "statistics_scope" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
-- Classify legacy results without changing player notes, exclusions or outcomes.
-- Touch updated_at so the existing incremental browser sync replaces cached rows.
UPDATE public.game_result r
SET statistics_scope = 'practice', updated_at = clock_timestamp() AT TIME ZONE 'UTC'
WHERE r.game_source = 'crossfire'
  AND (r.other_data->'crossfire'->>'resumed' = 'true'
    OR EXISTS (SELECT 1 FROM play.games g
      WHERE r.game_id = 'crossfire:' || g.id AND g.provenance IS NOT NULL));
--> statement-breakpoint
-- Provenance remains on the fork even after the source game or bookmark is deleted.
-- Only an opaque grouping key is exported; old round counts remain unknown.
UPDATE public.game_result r
SET other_data = jsonb_set(r.other_data, '{crossfire,practice}',
      jsonb_build_object('seriesId', encode(sha256(convert_to(
        (g.provenance->>'sourceGameId') || ':' || (g.provenance->>'position'), 'UTF8')), 'hex'))),
    updated_at = clock_timestamp() AT TIME ZONE 'UTC'
FROM play.games g
WHERE r.game_source = 'crossfire' AND r.game_id = 'crossfire:' || g.id
  AND g.provenance->>'kind' = 'practice'
  AND g.provenance->>'sourceGameId' IS NOT NULL
  AND g.provenance->>'position' IS NOT NULL
  AND jsonb_typeof(r.other_data->'crossfire') = 'object'
  AND r.other_data->'crossfire'->'practice' IS NULL;
