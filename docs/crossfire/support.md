# Crossfire Support and borrowed abilities

Remnant Interceptor, Honorable Nite Owl and Migs Mayfeld, How About a Toast? each
have their own ASH definition. Support creates one optional entry trigger and
offers an attack with another ready friendly unit. The attacker may be in either
arena. Borrowed keywords apply during declaration (v8 §6.3.1), so Unsanctioned
Patrol lends Saboteur before Sentinel restrictions are checked. Support neither readies units
nor permits an exhausted attack. A source that entered ready still cannot use
its Support to attack with itself.

Before the attack starts, `supportOrigins` captures the source's current ability
origins, or its recorded departure origins if that incarnation has left play.
The attacker gains those abilities except Support for the duration of the
attack. Printed, attached and already-borrowed abilities retain separate
origins. Runtime IDs distinguish multiple copies of the same printed trigger.
Grants live in the attack scope and expire when it ends. Granting abilities does
not retrigger entry abilities such as Shielded.

A trigger records its holder snapshot and ability origins at the time it
triggers. Its effects refer to the holder as “this unit,” while the origin
identifies the versioned card/profile that defined the ability. This allows
borrowed abilities to resolve after a grant expires or the source leaves play.
Departure records also retain effective statistics and whether the unit was
upgraded. All of this is serializable data; no closures are stored in game state.

Raid adds its total value while the unit is attacking, once per keyword
instance rather than once per nested attack scope. Restore combines its total
value into one On Attack trigger that heals the controlling player's base.
Remnant Interceptor lends Restore 1; Honorable Nite Owl lends Raid 1. Their own
keywords continue to work on their ordinary attacks. Migs lends an On Attack
ability that damages the defending unit for one, or two if the attacking unit
is upgraded. It does nothing against a base. The source Migs's upgrades do not
change the borrowed ability's amount.

Legal choices and unit statistics use effective abilities. Checkpoints validate
origin identities, trigger holder snapshots and excluded Support grants. Tests
cover optional/illegal attacks, stacking, timing, exact-copy source departure,
uniqueness, borrowed-trigger ordering, repeated Shield choices, fresh-process
recovery and every-input replay. A projected trigger uses its printed ability ID,
the acting unit's exact-copy reference and a separate `grantedBy` reference;
authoritative ID prefixes and private origin records are not sent to viewers.

The rules basis is supplied v8 §§3.6.8–9, 7.5.8–9, 7.5.20, 7.6, 7.7.3 and 8.11.
Other keyword families, attack-end trigger cards, continuous grants from other
units and attachment grants beyond keywords require their own engine handlers
and conformance cases. The current shared origin representation supports the
registered cards; it does not imply those unimplemented cards are admitted.


## Invoking a When Defeated ability

Chimaera, Reinforcing the Center uses `use-defeated-ability` on an exact friendly
unit selected by its controller. The `whenDefeated` unit filter checks effective,
available abilities, including grants. The resulting trigger batch has
`chooseOne: true`: choosing one ability consumes the choice, rather than resolving
all the unchosen abilities afterward. Normal target selection, optional choices,
limits, source snapshots and ability-origin projections apply. Invoking the
ability does not invent a defeat, an entry or a combat event (v8 §7.6.17).

An invoked source remains live until an actual effect moves it. Power-based
abilities use current statistics while it remains in play. Chimaera's separate
actual When Defeated ability creates two exhausted TIE Fighters.

The official Superlaser Technician templating update of July 20, 2026 says
“resource this unit and ready it.” Invoking it while the unit is in an arena can
therefore resource it directly, without defeating it. Ordinary departure cleanup
removes damage and upgrades and rescues captives. The ability controller gains
the resource, even if the card has a different printed owner (v8 §§1.7.5–8).
Resource membership and payment use the controller; subsequent movement into
hand or discard returns to the printed owner's zone. Only the resource controller
sees its face. Playing an opponent's resource transfers its resource membership
before resolving that play.

`top8-invoke.test.ts` verifies individual/granted choices, live statistics,
optional choices, actual defeat, live/defeated resource movement, ownership,
payment, visibility and recovery. Official text and errata are pinned in
`play/testing/fixtures/top8-invoke.json`.

## Repeating a used When Defeated ability

Grand Admiral Thrawn, ...How Unfortunate observes an accepted friendly When
Defeated ability, including an invocation by Chimaera. His leader face pays
exhaustion; his unit face offers an optional once-per-round repetition. These
are independent face abilities. Declining the unit trigger preserves its use.

The engine captures the observer when the original ability is used, then queues
it after that ability's effects. This preserves an observer that leaves play
during resolution without letting a nested trigger flush interrupt the original
ability. Private `usedDefeatedAbilities` records retain the original holder,
event context and printed or granted origin. Repetition creates a fresh trigger:
its targets and optional choices are selected again, and costs still apply.
Actual departure statistics remain tied to the original incarnation. Repetition
does not create another defeat event.

`top8-thrawn.test.ts` covers both faces, exhaustion and round limits, optional
branches, ability loss, invocation, new targets, origin and cost preservation,
source reincarnation, observer departure, projection privacy and malformed
checkpoints. Four shared recovery cases cover the queued observer, leader
payment, repeated target and unit limit. Official text is pinned in
`play/testing/fixtures/top8-thrawn.json`.

## Discarded-card abilities for one attack

Improvised Identity grants a separate once-per-round action to its attached
ground unit. The private top-three search selects at most one ground unit,
discards it, and randomizes the unchosen cards onto the deck bottom. It records
a discard rather than a draw. The optional attack still follows a failed search
or an empty deck; an exhausted host can search but cannot attack.

`attack-bound.gainsAbilitiesOf` takes the selected card's full printed abilities
for that attack. The `discarded-unit` origin retains its exact reference, including
Support and Piloting. Printed stats and traits are not copied, and gaining entry
abilities does not cause an entry. Attack declaration evaluates the granted
abilities against each potential defender before offering targets, so Saboteur
and attack prohibitions already apply. Borrowed triggers use the attacker as
their holder and retain the discarded card as their origin after defeat.

Round action usage records the holder, granting card and both incarnations.
Two attached copies have independent uses; replaying an upgrade creates a fresh
grant. All regroup phases in the same round retain those uses. Action projections
and logs include the exact granting upgrade; the browser labels the round limit
and highlights that copy alongside the holder. Browser protocol 25 carries the
additional action origin and limit.

Fifteen outcome scenarios in `top8-identity.test.ts` and four shared recovery
cases cover search privacy, server randomness, optional branches, round limits,
reentry, full ability grants, declaration restrictions, projection references and
checkpoint validation. The source text is pinned in
`play/testing/fixtures/top8-identity.json`.

The opt-in `identity` browser preset verifies the private search and optional
attack across reloads, selection and exact granting-card highlights, followed
by a complete two-player game with a spectator:

```bash
CROSSFIRE_TEST_DATABASE_URL=<running-worktree-url> CROSSFIRE_BROWSER_SCENARIO=identity bun run play:browser:test
```
