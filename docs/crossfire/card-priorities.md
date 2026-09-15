# Crossfire card implementation priorities

Use public tournament deck inclusion as a priority signal, then group work by
shared rules that can be completed and tested together. Inclusion is a proxy
for popularity, not evidence that a card was played during recorded matches.
An unsupported card remains rejected even when it is popular.

The isolated development database queried on 2026-09-09 contains 825 imported
tournaments, dated 2025-03-29 through 2026-09-06. The inclusive trailing 90-day
window relative to its newest imported tournament contains **9,283 distinct
decks**, across the formats present in that snapshot. Count board 1 only,
positive quantities, and each deck once even if linked to multiple events.
Do not publish player identities or private deck contents in this report.

| Card                              | Decks | Copies | Engine dependency exercised                                  |
| --------------------------------- | ----: | -----: | ------------------------------------------------------------ |
| Onyx Squadron Brute               | 1,753 |  4,830 | Defeat triggers, base healing, player choice                 |
| HK-47, Exclamation: Die, Meatbag! | 1,565 |  4,190 | Simultaneous-defeat observers, source history, uniqueness    |
| Green Leader, Crynyd's Sacrifice  | 1,173 |  3,196 | Optional targeted damage, nested defeat triggers, uniqueness |
| Snub Fighter Squadron             |   756 |  1,656 | Player-ordered When Played and v8 Ambush                     |
| Superlaser Technician             |   109 |    322 | Exact defeated copy returning as a ready, hidden resource    |

All five have dedicated implementations and conformance cases. The Technician
has lower inclusion but tests an important recovery and visibility boundary
before broader resource mechanics are admitted. The card catalog includes some
older Ambush reminder text; the attached v8 rules govern behavior: Ambush allows
an exhausted attacker and does not ready it.

Aggressive Negotiations (3,660 decks, 7,639 copies) is now implemented after
adding event execution and attack-duration modifiers. Surprise Strike shares
that attack primitive; Open Fire (27 decks, 66 copies) covers event damage.
The leading unimplemented cards in this sample are Chimaera, A Frightening
Reality (3,315), Pre Vizsla,
Strong-Willed Ruler (3,165), Koska Reeves, Warrior of Mandalore (3,156), and No
Glory — Only Results (3,117). Their dependencies must be implemented before
admission. The next completed wave implements Outer Rim Constable (2,657 decks,
4,823 copies) and Imperial Armored Commando (2,356 decks, 5,491 copies), following
a repeat of the same query on 2026-09-09. They exercise upgrade removal and
Shield/Sentinel. Dedicated Shield and Experience token definitions and Academy
Training (1 deck, 1 copy) establish token and ordinary upgrade behavior. Academy
Training is a small conformance fixture for modifiers, enemy attachments and
owner-specific discard; its inclusion is based on that dependency. Latts Razzi,
Deadly Whipmaster (1,778 decks, 4,900 copies) is also implemented: her token choice and damage
based on modified power build on these primitives. Refresh the
aggregate query before choosing a later wave rather than treating this snapshot
as a permanent ranking.

The search foundation adds Recruit (3 decks, 6 copies), Remnant Reserves and
Greef Karga (neither present in this sample). These deliberately small cards cover
private inspection, multiple selections and unit-triggered upgrade searches.
They establish the missing hidden-search milestone boundary. Sneak Attack
(114 decks, 296 copies) now implements discounted nested play and delayed defeat.

The first Piloting wave uses Clone Pilot (5 decks, 8 copies), Astromech Pilot
(3 decks, 8 copies) and Academy Graduate (2 decks, 4 copies). They isolate
alternate costs, role-specific triggers and granted Sentinel. Skyhopper Canyon
Runner (46 decks, 126 copies) supplies a ground Vehicle for the same tests.
These aggregates were refreshed with the same query and window on 2026-09-09.
The choice covers missing milestone mechanics before more complex Pilot cards.

The Support wave follows with Remnant Interceptor (129 decks, 314 copies), Migs
Mayfeld, How About a Toast? (116 decks, 257 copies), and Honorable Nite Owl
(53 decks, 139 copies), using the same refreshed sample. They exercise borrowed
triggers, Restore/Raid stacking, the attacking unit's identity and upgrade status,
and last known abilities after uniqueness defeats the new source.

The query can be run against the worktree's local database. It reads aggregate
information and makes no database changes:

```sql
WITH sample AS (
  SELECT DISTINCT td.deck_id
  FROM tournament_deck td
  JOIN tournament t ON t.id = td.tournament_id
  WHERE t.imported
    AND t.date >= (SELECT max(date) FROM tournament WHERE imported) - 90
)
SELECT dc.card_id, count(*) AS decks, sum(dc.quantity) AS copies
FROM sample s
JOIN deck_card dc ON dc.deck_id = s.deck_id
WHERE dc.board = 1 AND dc.quantity > 0
GROUP BY dc.card_id
ORDER BY decks DESC, dc.card_id;
```
