SELECT * FROM meta;
SELECT * FROM tournament_group;
SELECT * FROM tournament_group WHERE meta_id = 12;
SELECT * FROM tournament_group WHERE meta_id = 12 AND name LIKE 'PQ Week%';
SELECT * FROM tournament_group WHERE meta_id = 13 AND name LIKE 'PQ Week%';
SELECT * FROM tournament_group_tournament;

-- Create new PQ Week tournament groups
INSERT INTO tournament_group (name, meta_id, position, description, visible)
SELECT
    name, 13 as meta_id, position, description, visible
FROM tournament_group WHERE meta_id = 12 AND name LIKE 'PQ Week%';

INSERT INTO tournament_group (name, meta_id, position, description, visible)
SELECT
    name, 14 as meta_id, position, description, visible
FROM tournament_group WHERE meta_id = 12 AND name LIKE 'PQ Week%';

-- Control select for PQ Week groups
SELECT
    tgPremier.name,
    tgPremier.id as premier_id,
    tgLimited.id as limited_id,
    tgEternal.id as eternal_id
FROM
    tournament_group tgPremier
        JOIN tournament_group tgLimited ON tgPremier.name = tgLimited.name
        JOIN tournament_group tgEternal ON tgPremier.name = tgEternal.name
WHERE
    tgPremier.name LIKE 'PQ Week%' AND
    tgPremier.meta_id = 12 AND
    tgLimited.meta_id = 13 AND
    tgEternal.meta_id = 14;


-- UPDATE SCRIPT:
WITH target_groups AS (
    SELECT
        tg_premier.id AS old_group_id,
        tg_target.id  AS new_group_id,
        tg_premier.name,
        tg_target.meta_id
    FROM
        tournament_group tg_premier
            JOIN tournament_group tg_target ON tg_target.name = tg_premier.name
    WHERE
        tg_premier.meta_id = 12
      AND tg_target.meta_id IN (13, 14)
      AND tg_premier.name LIKE 'PQ Week%'
)
UPDATE
    tournament_group_tournament tgt
SET
    group_id = tg.new_group_id
FROM
    tournament t, target_groups tg
WHERE
    tgt.tournament_id = t.id
  AND tg.old_group_id = tgt.group_id
  AND tg.meta_id = t.meta
  AND t.meta IN (13, 14);

-- Change Preview script:
WITH target_groups AS (
    SELECT
        tgPremier.id AS old_group_id,
        tg_target.id AS new_group_id,
        tgPremier.name,
        tg_target.meta_id
    FROM
        tournament_group tgPremier
            JOIN tournament_group tg_target ON tg_target.name = tgPremier.name
    WHERE
        tgPremier.meta_id = 12
      AND tg_target.meta_id IN (13, 14)
      AND tgPremier.name LIKE 'PQ Week%'
)
SELECT
    t.id AS tournament_id,
    t.name AS tournament_name,
    t.meta AS tournament_meta,
    tg.name AS group_name,
    tgt.group_id AS current_group_id,
    tg.new_group_id AS target_group_id
FROM
    tournament_group_tournament tgt
        JOIN tournament t ON t.id = tgt.tournament_id
        JOIN target_groups tg ON tg.old_group_id = tgt.group_id AND tg.meta_id = t.meta
WHERE
    t.meta IN (13, 14);