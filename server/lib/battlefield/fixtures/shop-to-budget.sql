-- Preserve layouts before removing the old purchase inventory. Refuse to lose
-- placements if an existing layout references an unknown or foreign copy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM battlefield b
    CROSS JOIN LATERAL jsonb_array_elements(b.scene->'placements') p
    WHERE p ? 'inventoryId' AND NOT EXISTS (
      SELECT 1 FROM battlefield_inventory i
      WHERE i.id::text = p->>'inventoryId' AND i.user_id = b.user_id
    )
  ) THEN
    RAISE EXCEPTION 'Cannot migrate a Battlefield with an unresolved inventory copy';
  END IF;
END $$;
--> statement-breakpoint
UPDATE battlefield b
SET scene = jsonb_set(b.scene, '{placements}', COALESCE((
  SELECT jsonb_agg(
    CASE WHEN p.value ? 'inventoryId' THEN
      (p.value - 'inventoryId') || jsonb_build_object('id', p.value->>'inventoryId', 'itemId', i.item_id)
    ELSE p.value END
    ORDER BY p.ordinality
  )
  FROM jsonb_array_elements(b.scene->'placements') WITH ORDINALITY p(value, ordinality)
  LEFT JOIN battlefield_inventory i
    ON i.id::text = p.value->>'inventoryId' AND i.user_id = b.user_id
), '[]'::jsonb));
--> statement-breakpoint
-- Restore previously spent credits through the append-only ledger. Retrying
-- this backfill cannot refund the same debit twice.
INSERT INTO user_credits (user_id, amount, source, source_key)
SELECT user_id, -amount, 'battlefield-refund', 'battlefield-refund:' || id::text
FROM user_credits
WHERE source = 'battlefield-purchase' AND amount < 0
ON CONFLICT (source_key) DO NOTHING;
