# Tokens and conditional abilities

Unit tokens use dedicated `UnitDefinition` files with `token: true`. Creation
puts them into their printed arena exhausted and collects `created` triggers.
It does not play them. Shielded recognizes token creation; Spy's Raid applies
during attacks. Deck admission rejects token units and upgrades. Every token
leaving play moves to set-aside, including a token returned to hand.

Advantage is an Innate token upgrade with +1/+0. Its attached unit's attack or
defense ending collects a normal trigger to defeat the upgrade. This permits
ordinary ordering with other simultaneous triggers instead of treating the
token as an immediately expiring modifier.

`friendly-played` and `friendly-created` triggers record the exact unit as a
subject. Greef's leader face offers an optional exhaust payment; his unit face
grants Advantage without that payment. When multiple units are created, each
generates its own trigger. Exhausting the leader for one prevents paying for
another until he is ready again. Deployment does not count as playing a unit.

`select-units` exposes a selection whose total remaining HP cannot exceed the
card's budget. The authority calculates and validates that budget. The browser
gets only viewer-scoped card handles and their public HP costs. Pre Vizsla
defeats the selected exact incarnations simultaneously, records the number
defeated, then creates that many Mandalorians. Count values and group references
are serializable continuation data, never executable callbacks.

`phaseHistory.defeated` stores unit snapshots from the current phase, including
their controller and incarnation. It resets at each phase transition. Scenarios
can supply `defeatedThisPhase` aliases for discarded units or defeated leaders;
ordinary games populate history through the defeat procedure. Koska checks this
history, while Justifier checks the exact target's defeat after its damage.

Conditional abilities are evaluated for their current holder. Registered
conditions cover token presence, upgrades, and attacking a damaged unit. Support
reevaluates borrowed constant abilities for the recipient during its attack.
The currently registered constant conditions do not depend recursively on
power/HP calculations; adding such dependencies requires explicit evaluation
ordering and conformance tests. Numeric effects can read a bound unit's power
or remaining HP, using its departure statistics when necessary.

The twenty tournament definitions and four token dependencies are pinned in
`play/testing/fixtures/meta-tokens.json`. `meta-tokens.test.ts` checks outcomes,
optional branches, exact copies, removal, cost limits, public projection and
fresh-process continuation. Rules basis: supplied v8 token, trigger, simultaneous
effect and last-known-information rules. This batch uses engine 0.14.0, card
bundle 14, state 13 and browser protocol 12.

## Replacing token creation

Moff Jerjerrod, We Shall Redouble Our Efforts uses a passive replacement ability.
The private `create-tokens` frame preserves the original source, creating player,
selected token type, counts, exact recipients and subsequent effects before any
token is allocated. Its controller may defeat an eligible friendly holder of the
ability to double those counts, or decline. The chosen holder can have borrowed
the ability; each replacement source is tracked by incarnation. The sacrifice
occurs before creation, while its triggered abilities wait for the creation to
complete. A recipient that leaves play during that cost receives no upgrades.

The same continuation covers unit tokens, Shield/Experience/Advantage upgrades,
Credits and the Force. Giving an upgrade token to an opponent's unit preserves
the distinction between the creating player and the token's owner. Creating a
Force token still respects the one-token limit; an instruction ignored because
the player already has the Force offers no replacement. Grouped instructions
such as Crucible or Eviscerator and Helgait's divided Advantages preserve all
selected recipients through one replacement, rather than asking for new targets.
The rule basis is v8 §7.7.12, whose example explicitly keeps Moff's doubled Shields
on their originally chosen unit.

A creation continuation may retain a whole created group. Covering the Wing uses
that group with `notInGroup` to exclude every created X-Wing from its later
“another unit” choice (v8 §8.18.2). Phase abilities on newly created units, Shielded,
creation observers and later effects execute through their usual handlers.

Seventeen outcome scenarios in `top8-moff.test.ts` cover all token roles, decline,
ability loss, control/ownership, exact targets, grouped distribution, borrowed
replacement sources, cost-trigger timing and private projections. Five shared
recovery cases include both pending replacements and their subsequent choices.
The text is pinned in `play/testing/fixtures/top8-moff.json`.
