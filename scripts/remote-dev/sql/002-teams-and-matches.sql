-- Creates the only team retained in the contributor dump. It contains users
-- who explicitly shared match data, allowing team-statistics development while
-- ensuring no production teams or memberships survive.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'development_cleanup_user'
  ) THEN
    RAISE EXCEPTION
      'Run 001-core-data.sql before 002-teams-and-matches.sql.';
  END IF;
END
$$;

-- Delete dependent records explicitly. Production backups can contain legacy
-- rows from before the current cascading foreign keys existed.
DELETE FROM team_deck;
DELETE FROM team_join_request;
DELETE FROM team_member;
DELETE FROM team;

WITH development_team AS (
  INSERT INTO team (name, description, privacy, auto_add_deck)
  VALUES (
    'Swubase dev team!',
    'Sanitized, opted-in match data for contributor development.',
    'private',
    false
  )
  RETURNING id
)
INSERT INTO team_member (team_id, user_id, role, auto_add_deck)
SELECT
  development_team.id,
  dcu.user_id,
  CASE
    WHEN dcu.user_id = 'swubase' THEN 'owner'::team_role
    ELSE 'member'::team_role
  END,
  false
FROM development_team
JOIN development_cleanup_user dcu
  ON dcu.retain_match_data OR dcu.user_id = 'swubase';

DROP TABLE development_cleanup_user;

DO $$
BEGIN
  IF (SELECT count(*) FROM team) <> 1
    OR NOT EXISTS (SELECT 1 FROM team WHERE name = 'Swubase dev team!') THEN
    RAISE EXCEPTION 'The contributor dump must contain exactly one development team.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM team_member tm
    LEFT JOIN "user" u ON u.id = tm.user_id
    WHERE u.id IS NULL
  ) THEN
    RAISE EXCEPTION 'The development team contains a missing user.';
  END IF;
END
$$;

COMMIT;
