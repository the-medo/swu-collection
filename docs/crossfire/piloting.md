# Crossfire Piloting roles

Clone Pilot, Academy Graduate and Astromech Pilot have dedicated JTL definitions.
Skyhopper Canyon Runner supplies a ground Vehicle. Every registered definition
now records its official printed traits; a character riding a vehicle in its
artwork does not thereby have the Vehicle trait.

A unit definition may declare `piloting` cost options and a separate `upgrade`
profile. Each option has an ID, cost and required aspect icons. Legal play choices
indicate both the selected cost and the exact host. Normal unit play remains
available independently. `playCost` uses the selected cost's icons and applies
aspect penalties normally. A modified instruction to play a unit, such as Sneak
Attack, offers only unit play. Searches for upgrades do not match Piloting units
in the deck.

An attachment to a friendly Vehicle with no Pilot upgrade is required when
playing these cards with Piloting. Ground and space Vehicles are eligible. The
restriction belongs to the upgrade profile and is checked when attaching. It
is not a continuous condition that discards the Pilot if the host's traits or
control later change. An ordinary
upgrade profile uses the broader unit restriction.

`attachedTo` identifies the host incarnation. While attached, a printed unit
has the upgrade role: it cannot attack, take unit damage, host upgrades, or count
as a unit. Its upgrade modifiers affect the host; its unit abilities are inactive.
Defeating the host defeats the Pilot, and upgrade removal can defeat the Pilot
directly. Losing its HP modifier can defeat the host through maintenance, without
Shield preventing that defeat. In discard or hand the Pilot is a unit again.

Academy Graduate has Sentinel as a unit and grants Sentinel to its host as an
upgrade. `unitKeywords` combines printed keywords with attached grants and
removes duplicate keywords. Removing the Pilot immediately removes the grant.
Astromech Pilot has a When Played ability only in its upgrade profile: its
controller may heal up to two damage from a chosen unit, including an enemy.
The trigger retains its source snapshot if the upgrade leaves before resolution.

Views expose `face.kind` for the current role and `face.printedKind` for printed
identity, plus the existing opaque attachment link. Play options include a
`piloting` ID and the selected physical host handle. Server state and hidden
faces remain private. Scenario attachments use the same eligibility checks;
checkpoints validate profile and parent consistency. Fresh-process tests resume
upgrade-only choices, and every-input replay covers both play modes.

Ordinary Piloting follows supplied v8 §§3.5.6, 3.6 and 7.5.17. Extra Pilot slots,
conditional/granted abilities and upgrade reassignment now use shared primitives.
Converting an existing unit into an upgrade still needs its own engine path.
[Leader abilities](leader-abilities.md) preserves the Epic and face contracts;
[pilot leaders](pilot-leaders.md) documents the implemented unit/upgrade deployment
choices, Boba, Vader, Luke and leader return-to-base behavior.

## R2-D2’s additional Pilot permission

R2-D2, Artooooooooo! can itself be played on an occupied friendly Vehicle. Its
upgrade profile expressly overrides the Pilot-count restriction at attachment;
other restrictions still apply. Once attached, it grants the host one additional
Pilot slot. Multiple capacity grants add together, while host ability loss
suppresses the granted capacity. Existing attachments remain when a capacity
ability disappears. R2’s unit face has only its printed 1/4 statistics and
Piloting; the incoming permission and host grant belong to its upgrade profile.

## In-play Pilot conversion

Corvus, Inferno Squadron Raider can attach a friendly Pilot unit or reattach a
friendly Pilot upgrade. Eject detaches either player's Pilot upgrade into an
exhausted ground unit, then draws a card even if no Pilot could be detached.
Neither conversion plays, deploys, leaves or enters play. The physical reference,
incarnation, ownership, control, lasting effects and used deployment survive.
Conversion removes a participating unit from its current combat permanently.

A unit becoming an upgrade loses its damage, defeats its attached upgrades and
rescues its prisoners. It then uses its upgrade profile. Unit stat bonuses do
not become upgrade modifiers; ability loss continues to suppress its own text
and abilities it grants to the host. Attachment notifications still occur.
A Pilot leader switches its deployed role without spending another deployment.

The ability that converts a unit supplies an attachment restriction. Corvus
binds that restriction to its exact host incarnation. Converting a unit this
way does not invoke Piloting's occupied-host restriction. An existing upgrade
retains its original restriction when reattached. Detachment or leaving play
clears the conversion restriction (v8 §§3.5.6, 3.6.3b).

`departedUpgrades` complements unit departure history. Conversion creates no
history entry; a real departure records the actual final role. Power and Support
read the current in-play role first, then the recorded departure role. Temporary
control returns follow the same incarnation through role changes.

Seventeen scenarios in `play/testing/top8-conversion.test.ts` cover both cards,
leader roles, control, combat, last known information, cleanup, ability loss and
public projection. Four shared continuations cover conversion, reattachment,
detachment and recovery after a completed conversion.

## Upgrade defeat replacement

Luke Skywalker, You Still With Me? uses `defeatToUnit` only on his upgrade
profile. His controller may replace an upgrade defeat by moving the same card
to ground as an exhausted unit. The replacement emits conversion facts, not
entry, play or defeat events. As a unit he has no defeat replacement.

`defeatUpgrade` is the shared entry point for ability removal, costs, uniqueness
and attachment cleanup. It can queue an `upgrade-defeat` frame; callers must not
assume the card has already moved. The frame captures the affected card, its
current ability origins and observers. Replacement choices run before later
effects or triggers, including when the vehicle has left by defeat, capture or
return to hand. Maintenance waits for these choices. A temporary orphan is valid
only with its matching defeat continuation; conceding preserves that interrupted
board as a terminal checkpoint.

A unit's conversion can similarly queue `convert-pilot` while its own upgrades
resolve defeat replacements. This prevents removal of an HP modifier from
prematurely defeating the converting host before its damage is cleared. Existing
unit stat effects still apply if a Pilot becomes a unit again.

Ability loss is evaluated at the actual upgrade-defeat boundary. A loss tied to
a source that just left play has expired. A replaced instruction still fulfills
its cost and “if you do” condition (v8 §§1.8.10, 8.9.2): System Shock damages the
vehicle and Reforge searches after Luke's replacement completes. Returning Luke
himself to hand is not a defeat and provides no replacement choice.

Twenty-four scenarios in `play/testing/top8-luke.test.ts` cover these boundaries,
combat, simultaneous removals, uniqueness, repeat escapes, ownership, observer
suppression and concession. Six shared continuations exercise replacement,
vehicle departure, capture, conditional follow-up, conversion cleanup and an
interrupted game. The browser labels both replacement outcomes explicitly.

The opt-in `luke` browser preset exercises this through authenticated players and
a spectator, including reload at the replacement choice and a log reference that
highlights the converted ground unit:

```bash
CROSSFIRE_TEST_DATABASE_URL=<running-worktree-url> CROSSFIRE_BROWSER_SCENARIO=luke bun run play:browser:test
```

The acceptance run completed a full 67-action game on engine 0.72.

## Card-specific conversion restrictions

Poe, Sidon, Pantoran Starship Thief and Phantom II use `attach-self` with a
serialized host filter. It replaces the ordinary Piloting restriction during
that role and remains available for later reattachment. Ordinary Corvus
conversion retains its exact-host restriction. Both forms survive checkpoint
recovery, including while a converted unit's attached Luke resolves replacement.

`attached`, `detached`, `host-readied` and `host-attacked` are upgrade-owned
triggers. Their subject records the exact host at the event. Moving to a new host
can capture both detachment and attachment triggers. Returning or defeating an
upgrade, or converting it back to a unit, captures detachment before clearing
its old role. The controller of an upgrade remains distinct from its host and
from the player choosing a new host after a control-transfer instruction.

L3-37 uses a deferred unit-defeat group. Her controller chooses a friendly
Vehicle without a Pilot before the remaining simultaneous defeats commit.
Choosing attachment fulfills the replaced instruction, including an Exploit
cost, but does not record L3 as a defeated unit. Conversion removes damage and
defeats attached upgrades; their replacement choices finish first. Any other
units selected for that same defeat remain pending throughout cleanup.
