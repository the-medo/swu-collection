# Board values and turn events

Numeric effects can read a bound unit's power or remaining HP, count units
matching a filter, count distinct names, or divide the controller's base damage
into whole increments. `with-value` freezes a calculated amount for subsequent
effects. Unity of Purpose uses this to count names once before applying its
bonus. `modify-units` applies the entire set of modifiers before maintenance;
`damage-units` assigns damage simultaneously and can name a bound unit as its
source. Turbolaser Salvo uses the selected friendly space unit's power.

`select-target` composes unit filters and eligible bases. Exact references retain
the target's old incarnation after a departure. Departure records now include
the arena, so Collateral Damage and Let's Call It War can find another unit in
that arena even if their first target was defeated. Hidden destinations do not
acquire a new public tracking handle because an old reference is still in use.

Healing records the amount actually removed and can bind that amount for a
continuation. Barriss offers zero, one or two healing, then gives Advantage equal
to the actual amount healed. Resource payments during a triggered ability use
its controller even if the source has departed; an exhaust-self payment still
requires the exact source in play. Boba's played ability exercises both ordinary
payment and payment after that physical copy loses a uniqueness choice.

Taking initiative collects only that player's `initiative-taken` triggers before
finishing the action. Grogu, Ziton and the Mandalorian use normal nested trigger
ordering, including optional attacks and draws. The Mandalorian's two faces have
different abilities. `friendly-attack` records the exact attacking subject and
phase attack history. Boonta Eve Flagbearer and Canyon Frontrunner test whether
another unit has attacked, including an enemy unit. History resets at each phase
transition.
Scenario authors can provide `attackedThisPhase` aliases for units currently in
play, including an opponent's unit or repeated entries for the same unit.

The batch also adds aspect and name filters, conditional Sentinel/Raid, optional
effect payments, top-deck resourcing, bound healing, and mass modifiers. Printed
text is pinned in `play/testing/fixtures/meta-board.json`. Tests verify outcomes,
negative branches, exact source attribution, hidden-resource projection and
fresh-process continuations. Catalog checks validate every registered effect
against the checkpoint schema, including nested choice identifiers.

Rules basis: supplied v8 §§5.4–5.5, 6.3, 7.2, 7.6, 8.11 and 8.16. Engine 0.15.0,
card bundle 15 and state 14; the public browser protocol remains 12. Attack-end
observers, more general continuous grants, other replacements and hidden-zone
mechanics remain separate implementation work.

## Exact-unit conditions and counted draws

Unit filters can constrain a selection to an existing exact binding, inspect
whether that incarnation attacked this phase or is defending, and exclude a unit
with a specified upgrade token. Rose uses attack history independently of current
exhaustion. Obi-Wan excludes Experience-bearing units even if the token's
abilities are suppressed. Grogu binds one unit before allocating up to two healing
points, then uses the amount actually healed for his later damage choice.
Draw effects can resolve a numeric board value once at resolution; The Purrgil
King counts friendly units with at least seven remaining HP, including itself.

## Observing completed events

Draw events notify the drawing player's observers and opposing draw observers
with the actual count; a multi-card draw is one event and an empty draw is none.
Force use records consumption and phase history before collecting its observers.
The shared healing recorder emits one unit trigger after actual counters are
removed, including distributed healing. Healing zero damage does not trigger.
Playing an upgrade on a unit has a separate timing from attaching or creating a
token; Kylo observes only upgrades played by his controller on himself.

Base damage captures the unit's ability origins, including attack-granted
abilities, and each affected base's observers before maintenance. Actual damage
can notify both ordinary and combat-only source triggers; Overwhelm's excess is
an ordinary base damage event with a combat origin. Damage prevention cannot
create a successful damage event. Friendly Attack Ends observers receive the
exact defender, actual combat base damage and defender-defeat result. Departed
attackers retain their traits through last known information, so Boba still
recognizes a defeated Bounty Hunter. Whistling Birds can use its departed host's
arena and captured granted ability after mutual combat defeat.

The Top 8 observer scenarios and retained continuation workload cover nested
Force/healing, a defeated Hunter's observed attack and an opponent draw reaction
that suspends a granted attack before combat.

## Phase records and damage continuations

Phase history records actual enemy base damage, indirect damage, played card
traits, token creation and a player's discards from their own hand or deck. These
records reset at phase transitions. Discarding an event after playing it and a
unit's defeat do not count as discarding from hand. Explicit forced-discard effects
identify the player doing the discarding. Played cards retain their traits in
history after leaving play; entering through creation, deployment or rescue is
a separate event used by friendly-entry observers.

A token's creator and owner can differ: giving a Shield to an opponent's unit
counts as creation by the ability controller, while the token belongs to the
unit's controller. Scenario setup tokens do not create fictional phase events.
Indirect damage can retain an ability continuation through allocation and damage
prevention, binding the amount actually dealt to bases. Guerilla Soldier readies
only after that amount is positive. Eviscerator suppresses friendly Advantage
abilities, preserving their printed power and preventing their attack-end defeat.

`top8-history.test.ts` covers these distinctions and exact Credit transfers;
shared recovery cases retain stolen Credits, unresolved indirect damage and
suppressed Advantage triggers across a fresh process.
