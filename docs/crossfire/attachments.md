# Crossfire attachments and damage replacement

The current core represents each upgrade as its own card instance in the same
arena as its unit. `attachedTo` stores the parent's instance ID and incarnation.
The relationship is stored once; queries derive the unit's upgrades. A new
incarnation cannot inherit an old attachment. Arena movement preserves both
incarnations and carries the attached cards. Runtime unit queries exclude
upgrades, so an attachment cannot attack, defend, or become a unit-damage target.

Each upgrade definition declares modifiers. Current unit power/HP are derived
from its printed profile plus attached modifiers; the projector displays these
values. Ordinary upgrades retain their controller when attached to an enemy,
and go to their owner's discard when defeated. New token upgrades belong to the
unit's controller and move to set-aside when they leave play. They are omitted
from browser inventory, while public historical events keep their labels.
Tokens cannot enter a deck, hand, resource zone or discard. The 244-card practice
limit counts deck cards, leaders and bases; created tokens do not consume it.

The scenario builder accepts `attachments: [{card, unit, ref?, owner?}]`, where
`unit` is a placement alias or a deployed leader's alias. Ordinary ownership can
be explicit; token ownership must match the unit's controller. Checkpoints
reject missing parents, attachment cycles, mismatched incarnations, invalid
zones and token zones. Scenario inputs start settled and reject lethal HP.

## Damage and maintenance

A `damage` frame retains the entire simultaneous assignment batch, source
snapshots and exact target references. A Shield replaces a positive damage
instance before any damage is applied. If several Shields could be consumed,
the affected unit's controller chooses the physical token. Each choice is saved
in the frame; selected tokens are reserved until the batch applies. Combat with
multiple Shields on both units can suspend for each player and resume in a fresh
process without partially applying combat damage. A single eligible Shield is
automatic. Zero damage consumes none. One damage instance consumes one Shield.
No prevented damage event is emitted as dealt damage.

Maintenance checks base defeat first, then uniqueness, orphaned upgrades and
lethal units, repeating after removals. Losing an HP modifier can therefore
defeat its unit immediately; this is not damage and Shields cannot prevent it.
Defeated units' attachments are cleaned up before triggered abilities resolve. Unit departure snapshots and upgrade defeat
observers are captured before simultaneous removal; see
[attachment attributes](attachment-attributes.md) for the expanded behavior.
Shielded is a shared keyword trigger for play, deployment and creation; it
creates a separate token in the unit's normal trigger window. Sentinel filters
normal and Ambush target choices in the attacker's arena. Exhaustion does not
disable a defending Sentinel.

## Current scope and checks

Dedicated definitions cover Imperial Armored Commando, Outer Rim Constable,
Academy Training, Shield and Experience. The rules basis is the supplied v8.0
§§1.5.2, 3.6–3.7, 6.2–6.3, 7.5.11–12 and 7.7.5. The catalog and conformance tests
pin card identity/text separately from behavioral expectations.

Run `bun run play:check` and `bun run play:demo`. The attachment suite covers
costs and eligibility, enemy attachments, Sentinel, prevention, modifier-loss
defeat, leader cleanup, exact-copy projections, malformed checkpoints,
fresh-process replacement/removal choices, and accepted-input replay/isolation.

This is the Shield replacement implementation. Competing non-Shield replacement
effects, indirect damage, Overwhelm, Saboteur, granted abilities, upgrade-specific
attachment restrictions, control changes, token units and pilot upgrades remain
unsupported. Adding one requires its full resolution path and conformance cases;
there is no fallback that treats unsupported text as blank. The attachment graph
will also carry pilot cards once their runtime roles and rules exist; this step
does not admit pilot leaders or alter their deployment contracts.

## Latts Razzi and power-based effects

Latts Razzi, Deadly Whipmaster (LAW 039) has a dedicated definition. Her first
instruction suspends for a Shield-or-Experience token choice; her second deals
her current power to an enemy ground unit. Experience therefore increases the
damage from two to three. The token is still created if no enemy ground unit
exists. Shield replacement can interrupt that damage, and nested defeat triggers
resolve before the action ends.

A power-based effect reads the source's exact current incarnation when it is
still a unit. On leaving an arena for another zone/role, the engine records
effective power/HP and controller in `departedUnits`, keyed by physical ID and
incarnation. An older ability reads that departure record after its source leaves
play, including if the physical card has returned as a new copy. History is
server-only; it is neither an active modifier nor a granted ability. This extends
last-known statistics for v8 §8.11, not full continuous/granted-ability history.

The scenario builder starts at an action boundary; it does not fabricate past
departures. Ordinary engine movement creates this history, and exact checkpoints
retain it. Malformed or missing history needed by a suspended power-based effect
is rejected. Tests cover both token branches, enemy-only ground targets,
source defeat through uniqueness, modifier retention across reentry, nested
Shield choices, exact-copy hover, fresh-process continuation and every-input
recording replay. Latts introduced state 5, engine `crossfire-0.5.0`, cards
`crossfire-core-5` and browser protocol 5; use the engine guide for current pins.

Non-leader Piloting now extends the same graph with printed-unit cards whose
runtime role is upgrade. Eligibility, role-specific abilities, granted Sentinel
and removal are described in [Piloting roles](piloting.md). Ordinary upgrade
restrictions are also declared in their profiles; current ordinary upgrades
attach to any unit.

## All matching upgrades and former hosts

`select-upgrades` accepts `min: 'all', max: 'all'` for an automatic selection
of every matching upgrade. It creates the usual exact-reference group and
continues without a redundant player prompt. A finite maximum with this minimum
is invalid. The optional `maxCost` filter uses printed card cost, including the
unit's printed cost when a Pilot is attached. Liberty returns matching upgrades
to their owners; tokens go to set aside. R5-D4 defeats all upgrades on the
exact defending unit, including while his ability is borrowed through Support.

`upgrades-count` without a trait counts every attached upgrade, including tokens.
Axe Woves uses this for both power and HP; losing an upgrade may immediately
defeat him through loss of HP, even when that upgrade prevented damage.

Blade of Talzin's defeated trigger checks its former host's controller and Night
trait. A live host uses current attributes; a departed host uses the recorded
attributes of the exact prior incarnation. The hidden-zone `move-card` operation
can constrain `fromPlayer`, so a stolen Blade cannot return a card from another
player's discard under an instruction referring to its controller's discard.
