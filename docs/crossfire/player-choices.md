# Choices made by another player

Crossfire 0.32.0 / card bundle 32 / state 31 adds Governor's Shuttle and Dedra
Meero, Not Wasting Time. Browser view 17 carries these choices using the existing
option fields.

A decision's chooser is separate from the player resolving the ability.
`select-unit.chooser` can pass a selection to the opponent while its filter,
source, bindings and continuation retain the original ability controller.
`choose-mode.chooserOf` asks the current controller of a bound card to choose.
The authoritative decision context supplies that player's seat; another seat
cannot submit the decision. Choosing a mode does not transfer ownership of the
ability or change the player referenced by its subsequent effects. Its log entry
identifies the chooser. Mode options link to the exact affected card only when
that incarnation is visible to the viewer.

Governor's Shuttle collects a friendly selection and an enemy selection before
one shared `defeat-bound` effect. The first selection remains in private frame
bindings, with no public log or board change before both choices finish. The
second player cannot inspect the first choice. Players without units are skipped.
The Shuttle itself is eligible. Simultaneous defeat captures both sides' observers
before departure, and the original Shuttle remains the source of the effect for
protection checks (v8 §§7.1.4, 7.6.4).

Dedra's leader action pays one resource and exhausts before selecting an enemy
unit. That unit's controller chooses whether it takes two damage or Dedra's
controller draws. Choosing the damage branch prevents the draw even if a Shield
or other replacement prevents all damage. No enemy unit means no subsequent
choice or draw; costs remain paid. Her unit face instead has conditional Raid 2
while its controller has a larger hand. Hand counts are public; faces remain
private. Deployment follows the existing separate Epic action contract.

Nine scenarios in `play/testing/meta-player-choices.test.ts` cover seat ownership,
secret-differential choices, simultaneous observers, protection, costs, damage
prevention, face separation and hand-dependent combat. Fresh-process checks and
the retained workload cover the second player's unit selection and Dedra's
opponent-controlled mode. Run `bun run play:check`, the frontend build for changed
labels, and the committed bundle's archive verification.

Primary card details:
[Governor's Shuttle](https://admin.starwarsunlimited.com/api/card/details/46547?locale=en),
[Dedra Meero](https://admin.starwarsunlimited.com/api/card/details/39425?locale=en).

## Public modes and wagers

`choose-mode` logs its selected static mode ID with the source card. Every viewer
receives that public choice; hidden card identities and inspections still follow
their own visibility rules. The browser renders the label in the game log.
Lando Calrissian, Full Sabacc first chooses one of six aspects, then chooses a
deck. Only afterward is its top card discarded and checked for the chosen
printed aspect. A miss or empty deck does not refund the paid action. Its unit
face instead offers the separate deployed Credit exchange.

Cobb Vanth's `excludeSelf` trigger condition compares the source and subject
incarnations at the play event. Later movement does not undo that trigger. The
optional self-damage can still resolve if the played unit is gone, but a later
incarnation cannot receive its Shield. Damage that defeats Cobb still grants the
Shield to a surviving subject. Replacing the damage with Shield prevention also
satisfies “If you do” (supplied v8 §8.9.2). The unit's Grit remains independent
of its optional triggered ability. Tests cover both choices, exact references,
lethal and replaced damage, public aspect choices, private deck differences and
fresh-process Credit/choice recovery.

## Distributing tokens and healing

`distribute` suspends in an `allocate-benefit` frame. The player may allocate
up to the printed amount across eligible exact units, including repeated copies
of the same handle. Healing limits each unit to its current damage; tokens may
be concentrated on one unit. Selection is validated before all benefits apply.
The resulting count is available to subsequent effects through a named value.
The view uses the existing allocation controls with healing/token labels.

Elzar Mann allocates up to five Advantage tokens among other friendly units,
then the opponent searches twice that count for an event. His ready-entry
condition recognizes a controlled Force leader on either face, including runtime
leader attributes. Trace Martez has no unit-face healing; when played as a Pilot,
she grants her host the optional divided-healing On Attack ability. Both frames
and Elzar's opponent search are in the shared executable recovery workload.

Time of Crisis uses consecutive mandatory `select-unit` choices, each owned by
the relevant player. `allowMissing` carries the ability forward if a player has
no units. Both exact references remain bound while the opponent chooses.
`UnitFilter.otherThanAny` excludes those references from one simultaneous damage
frame, including when a spared unit is a deployed leader. Replacement choices
occur only after all damage assignments are fixed.
