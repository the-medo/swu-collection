

-- deck
SELECT
    d.*
FROM
    tournament_group_tournament tgt
        JOIN tournament_deck td ON td.tournament_id = tgt.tournament_id
        JOIN deck d ON d.id = td.deck_id
WHERE
    tgt.group_id = '';

-- deck_card
SELECT
    dc.*
FROM
    tournament_group_tournament tgt
        JOIN tournament_deck td ON td.tournament_id = tgt.tournament_id
        JOIN deck d ON d.id = td.deck_id
        JOIN deck_card dc ON dc.deck_id = d.id
WHERE
    tgt.group_id = '';

-- tournament_deck
SELECT
    td.*
FROM
    tournament_group_tournament tgt
        JOIN tournament_deck td ON td.tournament_id = tgt.tournament_id
WHERE
    tgt.group_id = '';

-- tournament_match
SELECT
    tm.*
FROM
    tournament_group_tournament tgt
        JOIN tournament_match tm ON tm.tournament_id = tgt.tournament_id
WHERE
    tgt.group_id = '';

