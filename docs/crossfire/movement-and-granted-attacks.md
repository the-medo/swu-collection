# Movement and granted attacks

The v8 rule baseline treats changing arenas as remaining in play (§8.36), and
applies an attack's granted abilities before its target is declared (§6.3.1).
Printed text for this batch is pinned in
[meta-movement.json](../../play/testing/fixtures/meta-movement.json).

`select-upgrades` binds a chosen group of exact incarnations, filtered by
controller, host, uniqueness, runtime leader role or an excluded copy.
`move-upgrades` removes that group before maintenance. Defeat and return to hand
are distinct operations; tokens go to set-aside instead of a hidden zone.
A continuation can retain the original host reference for System Shock. If that
host is defeated when an HP upgrade leaves, the later damage cannot affect a
new copy. Returning an upgrade uses its owner's hand.

Blue Leader's arena change uses the current zone and preserves its incarnation
and attachments. The checkpoint validator therefore accepts units outside their
printed arena. Scenario placements default to the printed arena and can declare
`movedArena: true` to represent an already moved unit. Entry still uses the
printed arena when playing a card normally.

`attack-bound` can grant simple abilities and a calculated power bonus for that
attack. Saboteur participates in target legality, including the existing rule
that a unit unable to gain abilities cannot use a granted keyword. Once declared,
the attack stores its bonus and ability origins for triggers, combat, Support
and recovery. They expire with that attack. Masterstroke counts enemy units in
the selected attacker's current arena. Commence checks total resource counts.

Resource choices are owned by the affected player even when the source belongs
to an opponent. Only their own resource identities are present in private facts;
public readiness/payment facts contain counts. This supports the Sheathipede's
optional opponent readiness and Emergency Powers' chosen payment amount.

The twelve scenarios in `meta-movement.test.ts` cover every new definition,
optional branches, exact-copy hosts, token departure, arena identity, Saboteur
targeting, attack bonus expiry, resource privacy and fresh-process choices.
