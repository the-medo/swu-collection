-- Sanitizes a restored production database for contributor development.
--
-- The script that runs this file invokes psql with ON_ERROR_STOP. This file is
-- intentionally transactional: a schema mismatch or failed privacy assertion
-- aborts the export rather than producing a partially sanitized dump.
--
-- The short-lived development_cleanup_user table is consumed and dropped by
-- 002-teams-and-matches.sql. Keep these files in filename order.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "user" WHERE id = 'swubase') THEN
    RAISE EXCEPTION
      'Expected the system user "swubase" to exist before sanitizing the contributor dump.';
  END IF;
END
$$;

CREATE TABLE development_cleanup_user (
  user_id text PRIMARY KEY,
  retain_data boolean NOT NULL,
  retain_match_data boolean NOT NULL
);

INSERT INTO development_cleanup_user (user_id, retain_data, retain_match_data)
SELECT
  u.id,
  u.id = 'swubase'
    OR COALESCE(
      (
        SELECT us.value = 'true'
        FROM user_settings us
        WHERE us.user_id = u.id AND us.key = 'share_development_data'
      ),
      false
    ) AS retain_data,
  COALESCE(
    (
      SELECT us.value = 'true'
      FROM user_settings us
      WHERE us.user_id = u.id AND us.key = 'share_development_data'
    ),
    false
  )
    AND COALESCE(
      (
        SELECT us.value = 'true'
        FROM user_settings us
        WHERE us.user_id = u.id AND us.key = 'share_development_data_matches'
      ),
      false
    ) AS retain_match_data
FROM "user" u;

CREATE TABLE development_collections_to_delete (
  collection_id uuid PRIMARY KEY
);

INSERT INTO development_collections_to_delete (collection_id)
SELECT c.id
FROM collection c
JOIN development_cleanup_user dcu ON dcu.user_id = c.user_id
WHERE NOT dcu.retain_data;

CREATE TABLE development_decks_to_delete (
  deck_id uuid PRIMARY KEY
);

INSERT INTO development_decks_to_delete (deck_id)
SELECT d.id
FROM deck d
JOIN development_cleanup_user dcu ON dcu.user_id = d.user_id
WHERE NOT dcu.retain_data;

CREATE TABLE development_card_pools_to_delete (
  card_pool_id uuid PRIMARY KEY
);

INSERT INTO development_card_pools_to_delete (card_pool_id)
SELECT cp.id
FROM card_pools cp
JOIN development_cleanup_user dcu ON dcu.user_id = cp.user_id
WHERE NOT dcu.retain_data;

-- These short-lived indexes make foreign-key checks practical when deleting a
-- production-sized set of decks. They are dropped before exporting the dump.
CREATE INDEX development_user_deck_favorite_deck_id_idx ON user_deck_favorite (deck_id);
CREATE INDEX development_game_result_deck_id_idx ON game_result (deck_id);
CREATE INDEX development_karabast_lobby_match_deck_id_idx ON karabast_lobby_match (deck_id);
CREATE INDEX development_team_deck_deck_id_idx ON team_deck (deck_id);
CREATE INDEX development_tournament_deck_deck_id_idx ON tournament_deck (deck_id);
CREATE INDEX development_tournament_match_p1_deck_id_idx ON tournament_match (p1_deck_id);
CREATE INDEX development_tournament_match_p2_deck_id_idx ON tournament_match (p2_deck_id);

-- Never distribute authentication sessions, verification values, or raw
-- game-provider payloads. Opted-in integration rows remain for UI and schema
-- testing, but their provider-specific identity, arbitrary provider metadata,
-- and credentials are replaced below.
TRUNCATE TABLE account, session, verification;

DELETE FROM user_integration ui
USING development_cleanup_user dcu
WHERE ui.user_id = dcu.user_id
  AND NOT dcu.retain_data;

UPDATE user_integration
SET
  external_user_id = 'development-' || id::text,
  link_token_enc = NULL,
  refresh_token_enc = NULL,
  access_token_enc = NULL,
  access_token_expires_at = NULL,
  refresh_token_expires_at = NULL,
  metadata = '{}'::jsonb;

TRUNCATE TABLE integration_game_data;

DELETE FROM karabast_lobby_match klm
USING development_cleanup_user dcu
WHERE klm.user_id = dcu.user_id
  AND NOT dcu.retain_match_data;

UPDATE karabast_lobby_match
SET
  lobby_id = 'development-' || match_id::text,
  lookup_key = 'development-' || md5(match_id::text || ':' || user_id);

-- This history is large and can be regenerated from the retained current data.
TRUNCATE TABLE card_variant_price_history;

-- Application configuration is retained. Operational secrets are supplied via
-- the local .env file rather than stored in this table.

-- Remove data that is personal or derived from personal activity. The card-stat
-- tables must go before deck deletion because their deck foreign keys do not
-- cascade.
DELETE FROM user_deck_favorite udf
WHERE udf.deck_id IN (SELECT deck_id FROM development_decks_to_delete)
OR EXISTS (
  SELECT 1
  FROM development_cleanup_user dcu
  WHERE dcu.user_id = udf.user_id AND NOT dcu.retain_data
);

DELETE FROM player_watch pw
USING development_cleanup_user dcu
WHERE pw.user_id = dcu.user_id
  AND NOT dcu.retain_data;

DELETE FROM tournament_matchup_filter tmf
USING development_cleanup_user dcu
WHERE tmf.user_id = dcu.user_id
  AND NOT dcu.retain_data;

DELETE FROM card_stat_matchup_overview;

UPDATE tournament_weekend_resource
SET user_id = 'swubase'
WHERE user_id IS NOT NULL
  AND user_id <> 'swubase';

DELETE FROM entity_resource;
DELETE FROM entity_price;

-- Keep game results only for users who separately opted into match sharing.
-- Event titles remain as part of the opted-in match grouping, while notes and
-- external game identifiers are stripped from the retained records.
DELETE FROM game_result gr
USING development_cleanup_user dcu
WHERE gr.user_id = dcu.user_id
  AND NOT dcu.retain_match_data;

DELETE FROM user_event ue
USING development_cleanup_user dcu
WHERE ue.user_id = dcu.user_id
  AND NOT dcu.retain_match_data;

UPDATE game_result gr
SET
  match_id = NULL,
  game_id = 'development-' || gr.id::text,
  note = NULL,
  other_data = '{}'::jsonb
FROM development_cleanup_user dcu
WHERE gr.user_id = dcu.user_id
  AND dcu.retain_match_data;

UPDATE user_event ue
SET
  melee_id = NULL,
  note = NULL
FROM development_cleanup_user dcu
WHERE ue.user_id = dcu.user_id
  AND dcu.retain_match_data;

-- Retain collections only for users who opted into development-data sharing.
-- Their free-text descriptions and card notes are removed in all cases.
DELETE FROM collection_source_collection csc
WHERE csc.collection_id IN (SELECT collection_id FROM development_collections_to_delete)
   OR csc.source_collection_id IN (SELECT collection_id FROM development_collections_to_delete);

DELETE FROM collection_card cc
WHERE cc.collection_id IN (SELECT collection_id FROM development_collections_to_delete);

DELETE FROM collection c
WHERE c.id IN (SELECT collection_id FROM development_collections_to_delete);

UPDATE collection c
SET description = ''
FROM development_cleanup_user dcu
WHERE c.user_id = dcu.user_id
  AND dcu.retain_data;

UPDATE collection_card cc
SET note = NULL
FROM collection c, development_cleanup_user dcu
WHERE cc.collection_id = c.id
  AND c.user_id = dcu.user_id
  AND dcu.retain_data;

-- A card pool and its linked deck data are retained only when both the pool and
-- deck owners opted in. The explicit order handles foreign keys without relying
-- on cascade behavior.
DELETE FROM card_pool_deck_cards cpdc
WHERE EXISTS (
  SELECT 1
  FROM card_pool_decks cpd
  WHERE cpd.deck_id = cpdc.deck_id
    AND (
      cpd.card_pool_id IN (SELECT card_pool_id FROM development_card_pools_to_delete)
      OR cpd.deck_id IN (SELECT deck_id FROM development_decks_to_delete)
    )
)
OR cpdc.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM card_pool_decks cpd
WHERE cpd.card_pool_id IN (SELECT card_pool_id FROM development_card_pools_to_delete)
   OR cpd.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM card_pool_cards cpc
WHERE cpc.card_pool_id IN (SELECT card_pool_id FROM development_card_pools_to_delete);

UPDATE deck d
SET card_pool_id = NULL
WHERE d.card_pool_id IN (SELECT card_pool_id FROM development_card_pools_to_delete);

DELETE FROM card_pools cp
WHERE cp.id IN (SELECT card_pool_id FROM development_card_pools_to_delete);

UPDATE card_pools cp
SET description = NULL
FROM development_cleanup_user dcu
WHERE cp.user_id = dcu.user_id
  AND dcu.retain_data;

-- Non-retained user decks can be linked from global tournament tables, whose
-- foreign keys do not cascade. Remove only those links before deleting the
-- private decks themselves; public imported decks are owned by "swubase" and
-- therefore remain available for development.
DELETE FROM tournament_match tm
WHERE tm.p1_deck_id IN (SELECT deck_id FROM development_decks_to_delete)
   OR tm.p2_deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM tournament_deck td
WHERE td.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM deck_information di
WHERE di.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM deck_card dc
WHERE dc.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM card_pool_deck_cards cpdc
WHERE cpdc.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM card_pool_decks cpd
WHERE cpd.deck_id IN (SELECT deck_id FROM development_decks_to_delete);

DELETE FROM deck d
WHERE d.id IN (SELECT deck_id FROM development_decks_to_delete);

DROP INDEX development_user_deck_favorite_deck_id_idx;
DROP INDEX development_game_result_deck_id_idx;
DROP INDEX development_karabast_lobby_match_deck_id_idx;
DROP INDEX development_team_deck_deck_id_idx;
DROP INDEX development_tournament_deck_deck_id_idx;
DROP INDEX development_tournament_match_p1_deck_id_idx;
DROP INDEX development_tournament_match_p2_deck_id_idx;

UPDATE deck d
SET description = ''
FROM development_cleanup_user dcu
WHERE d.user_id = dcu.user_id
  AND dcu.retain_data;

UPDATE deck_card dc
SET note = ''
FROM deck d, development_cleanup_user dcu
WHERE dc.deck_id = d.id
  AND d.user_id = dcu.user_id
  AND dcu.retain_data;

-- Tournament data is globally useful but must not retain the production user
-- who created it. Assign it to the synthetic system user before user deletion.
UPDATE tournament
SET user_id = 'swubase'
WHERE user_id <> 'swubase';

-- Retain preferences for opted-in users, including their development-sharing
-- choices. Preferences owned by deleted users must be removed explicitly to
-- support legacy backups without the current cascading foreign key.
DELETE FROM user_settings us
USING development_cleanup_user dcu
WHERE us.user_id = dcu.user_id
  AND NOT dcu.retain_data;

-- Contributor copies are local development environments, so every retained
-- account is an administrator. The system record fulfils ownership foreign keys
-- without exposing the real SWU Base operator's profile.
UPDATE "user"
SET
  role = 'admin',
  banned = false,
  ban_reason = NULL,
  ban_expires = NULL
WHERE id IN (
  SELECT user_id
  FROM development_cleanup_user
  WHERE retain_data
);

UPDATE "user"
SET
  name = 'SWU Base Development',
  email = 'swubase-development@invalid.local',
  email_verified = false,
  image = NULL,
  role = 'admin',
  banned = false,
  ban_reason = NULL,
  ban_expires = NULL,
  display_name = 'SWU Base Development',
  country = NULL,
  state = NULL,
  currency = 'USD'
WHERE id = 'swubase';

DELETE FROM "user" u
USING development_cleanup_user dcu
WHERE u.id = dcu.user_id
  AND NOT dcu.retain_data;

DROP TABLE development_collections_to_delete;
DROP TABLE development_decks_to_delete;
DROP TABLE development_card_pools_to_delete;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM account)
    OR EXISTS (SELECT 1 FROM session)
    OR EXISTS (SELECT 1 FROM verification)
    OR EXISTS (SELECT 1 FROM integration_game_data) THEN
    RAISE EXCEPTION 'Credential or raw integration data remains after contributor-dump sanitization.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_integration ui
    LEFT JOIN development_cleanup_user dcu ON dcu.user_id = ui.user_id
    WHERE dcu.retain_data IS DISTINCT FROM true
      OR ui.link_token_enc IS NOT NULL
      OR ui.refresh_token_enc IS NOT NULL
      OR ui.access_token_enc IS NOT NULL
      OR ui.access_token_expires_at IS NOT NULL
      OR ui.refresh_token_expires_at IS NOT NULL
      OR ui.external_user_id NOT LIKE 'development-%'
      OR ui.metadata <> '{}'::jsonb
  ) THEN
    RAISE EXCEPTION 'A non-opted-in integration or integration credential remains.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM karabast_lobby_match klm
    LEFT JOIN development_cleanup_user dcu ON dcu.user_id = klm.user_id
    WHERE dcu.retain_match_data IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'Karabast lobby matches remain for a user who did not opt into match sharing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM game_result gr
    LEFT JOIN development_cleanup_user dcu ON dcu.user_id = gr.user_id
    WHERE dcu.retain_match_data IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'Game results remain for a user who did not opt into match sharing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "user" u
    LEFT JOIN development_cleanup_user dcu ON dcu.user_id = u.id
    WHERE dcu.retain_data IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'A non-opted-in user remains after contributor-dump sanitization.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM user_settings us
    LEFT JOIN development_cleanup_user dcu ON dcu.user_id = us.user_id
    WHERE dcu.retain_data IS DISTINCT FROM true
  ) THEN
    RAISE EXCEPTION 'Settings remain for a user who did not opt into development-data sharing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM tournament_weekend_resource
    WHERE user_id IS DISTINCT FROM 'swubase'
  ) THEN
    RAISE EXCEPTION 'A tournament-weekend resource is not assigned to the system user.';
  END IF;
END
$$;

COMMIT;
