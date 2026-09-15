# Secrets of Power cards

The tracked official catalog contains 266 canonical identities with a SEC
printing; all 266 are implemented. This work adds 157 dedicated definitions, bringing
the complete registry to 1,163 cards. The set includes reprints whose implementation remains in its original
set directory. Card definitions and coverage in `play/cards/registry.ts` are the
runtime source of truth.

The first batch adds 46 definitions. Text, uniqueness and official clarifications
are pinned in `play/testing/fixtures/sec-foundations.json`. The underlying rules
remain the supplied v8.0 comprehensive rules; its Ambush instruction allows an
attack while exhausted and does not ready the attacker. Older reminder rulings
that mention readying do not change that implementation.

Conditional abilities use current public state: unit counts, traits, names,
damage, exhaustion, upgrades, resources and initiative. Figure of Unity grants
an aura from its host, so the host's controller receives the benefit even when
the upgrade belongs to an opponent. Exhausting the host or losing its abilities
removes the grant. Tala excludes herself from Hidden; Muckraker's attack
restriction permits the Sentinel exception.

Congress of Malastare discounts the first upgrade **played as an upgrade** each
phase. Piloting qualifies when used to attach a Pilot, while playing that same
card as a unit neither receives nor consumes the reduction. The play-cost query
and phase/round histories check the played role independently of printed type.

`play/testing/sec-foundations.test.ts` exercises combat outcomes, targeting,
conditional changes, aura removal and costs. Catalog conformance checks compare
each definition with its canonical identity and pinned evidence.

## Choices, triggers and nested play

The second batch adds 89 definitions, pinned in `sec-effects.json`. It uses the
existing serializable choices for Disclose, hand inspection, naming, searches,
costs, grouped targets, capture, healing and nested attacks. A resource play
explicitly granted by an effect can select eligible resources owned by its actor;
normal actions still need their own play permission. When Has Become Now follows
its official erratum: only a successful play puts a replacement resource into
play. It does not use the leader-deployment Plot trigger.

Miraj's aura filters the actual attacker by its current defending unit. It does
not depend on Miraj herself attacking. Tarkin schedules return to the chosen
unit's owner when his exact source incarnation leaves; if he has already left,
the control change and return both resolve. Maul retains his separate printed
survival condition.

Duchess's random discard uses the existing server randomness frame with an
explicit affected player. The hidden hand never enters the other player's or
spectator's view. Viper's inspection likewise remains private, while ISB Agent
reveals only the selected event. The two choices in Kreia's Whispers retain their
separate exact references and private deck order.

`sec-effects.test.ts` checks card outcomes and illegal choices. Six additional
shared continuation cases cover hand inspection, a second deck placement,
random discard, control, simultaneous damage and resource play; each also has a
fresh-process conformance check.

## History and protection

Nine further cards use explicit action/phase history and public numeric queries.
Fully Armed and Operational remembers the opponent's previous action in this
phase, including attacks caused by abilities. Oppression Breeds Rebellion counts
units defeated while actually attacking. Both histories reset with the phase.
Darth Sion uses power captured at defeat, including temporary modifiers.

One in a Million rejects hand play even through a card effect. Its target must
have both power and remaining HP equal to the ready resource count **after** its
payment and resource-zone departure. Credits and units are not resources for
that query. Libertine counts exact prisoners attached to its current incarnation.

Implicate stores its granted On Defense trigger in the ordinary lasting-effect
contract. Elite Squad's damage trigger is captured before defeat maintenance,
including damage from friendly abilities and damage that defeats the Squad.
Populist Advisor distinguishes enemy combat damage from other base damage.

Willrow protects his single friendly upgrade from enemy ability defeat/return.
The host leaving play still defeats attached upgrades, and a Shield still defeats
itself to prevent damage. Enemy Saboteur respects the protection. Simultaneous
upgrade removal determines every eligible upgrade before removing the first, so
removing one of two upgrades does not newly protect the second during that same
instruction. Ability loss removes Willrow's protection.

Evidence is pinned in `sec-history.json`. Outcome and corrupted-checkpoint cases
are in `sec-history.test.ts`; four more shared continuation cases exercise the
new history and granted-trigger state across process restarts.

## Choices, sequences and resource payments

The final thirteen cards complete SEC. Their official text and rulings are pinned
in `sec-choices.json`, `sec-sequences.json`, `sec-passives.json` and
`sec-payments.json`; outcome tests live in `sec-choices.test.ts` and
`sec-passives.test.ts`.

Elia Kane chooses three resource backs before privately inspecting only those
cards. Hired Slicer reveals the selected deck’s top two cards, then returns the
exact cards in server-randomized order even when exhaustion is declined. A short
deck does not fulfill the complete two-card reveal condition. Cikatro preserves
the distinction between the opponent paying and the original ability controller
drawing the revealed card.

Let’s Talk records all distinct guard/prisoner pairs before any capture.
Departures and Bounties are captured before movement, and prisoner rescues follow
the simultaneous instruction. Mon Mothma resolves each attack and all its
triggers before choosing another eligible unit. The used-incarnation list
prevents repeating the same unit’s attack through her ability.

Obi-Wan grants a phase-limited permission for the exact milled card. It costs
resources, ignores aspect penalties and supports units, Piloting, upgrades and
events. Ownership is retained. Under v8 §§3.3.7 and 4.7, an event played from
discard re-enters as a new copy; its consumed permission cannot play it again.

Cassian, Vigil and Umbaran use ordered damage replacements alongside Shields.
Each transformation applies once to its packet. Umbaran records the first
attempted damage even if it was prevented or unpreventable. AAT checks the
actual friendly damage after replacements. Sly Moore’s erratum is represented
by a phase-wide modifier that survives her departure and affects later units.
Exiled from the Force imposes trait and ability restrictions from its upgrade;
only Grit can remain or be gained while that upgrade ability is active.

Vuutun Palaa discounts itself by friendly Droid count and permits ready friendly
Droids to pay resource costs only while its ability is in play. Credit tokens,
real resources and exhausted Droids remain distinct. Spending Droids counts as
resources paid, does not count as spending Credits, and does not increase the
number of resources for deployment or card conditions. An explicit payment
choice is offered even if enough ordinary resources are ready. A card cannot
exhaust twice for a compound cost; exhausting then returning or defeating that
card can pay distinct costs in the permitted order (v8 §6.2.4d).

The recovery workload contains twenty SEC checkpoints, including private
inspection, random bottom order, simultaneous captures, sequential attacks,
foreign discard play, ordered damage, post-damage conditions, phase modifiers
and both players’ alternative payments. The gallery includes these SEC choice
panels and a Droid payment resolved by clicking the board.

Current development bundle: engine `crossfire-0.112.0`, state `97`, cards
`crossfire-core-111`, browser protocol `35`. Only the newest committed executable
is archived during unreleased development.
