# Jump to Lightspeed card coverage

JTL started with 139 of its 266 canonical identities registered. Alternate art
and reprints share an implementation; a reprint remains in its original set
folder. All 127 previously missing cards are implemented in groups with official card
text, Pilot text and clarifications pinned beside the conformance tests.

The foundation group adds 58 definitions, bringing JTL coverage to 197/266 and
the registry to 1,385 cards. It covers ships, separate Pilot/unit roles,
conditional statistics and keywords, resource discounts, token creation,
upgrade removal, phase modifiers and round-limited abilities. Ordinary Piloting
uses its own cost and host eligibility. Pilot text does not run on the unit side.

Backstabber follows the official errata: its Experience token can go to a unit
other than its attached unit. Unit exclusions resolve the exact host reference,
including when the choice is restored from a checkpoint. Its target choice and
BB-8's optional resource payment are included in the shared recovery workload.

The effects group adds 45 definitions, bringing JTL coverage to 242/266 and
registry coverage to 1,430. Focus Fire preserves each Vehicle as a separate
damage source and resolves simultaneous Shield replacements. Attack Run keeps
its two attackers distinct. Exhaustion counts record only successfully exhausted
units; empty-deck milling still continues to the remaining instructions. These
four suspension points join the recovery workload.

Moff Gideon's unit cost increase applies to every later unit play in the phase,
including after he leaves play. It does not tax a card played as a Pilot upgrade.
Fly Casual and Scramble Fighters create direct attack restrictions that survive
ability loss. Radiant VII calculates each recipient's penalty from that unit's
own damage without a recursive statistics lookup.

Swarming Vulture Droid supports fifteen copies in the existing core-practice
format. This does not add competitive deck legality enforcement: core-practice
continues to permit testing decks outside tournament construction limits.

The interaction group adds 12 definitions, bringing JTL coverage to 254/266
and registry coverage to 1,442. It covers exact upgrade return and reattachment,
attachment and host-ready triggers, direct attack/base prevention, and indirect
damage assignment from the specific source unit. Jarek checks his upgrade
controller's arena presence separately from the attached unit's controller.
Rampart's power threshold applies only to the regroup ready step.

Close the Shield Gate can protect either base and leaves its prevention unused
when damage is unpreventable. Unit-only replacement abilities remain limited to
units. Dorsal Turret captures its trigger after actual combat damage even when
its attacking host is subsequently defeated. Kimogila records only the exact
units damaged by its own packet. Targeting Computer uses the current unit's
abilities or its recorded departure abilities, never a later incarnation.

The shared recovery workload includes six more suspension points: ordering base
prevention, allocating Kimogila's damage, selecting a new upgrade host, paying
readiness debt, returning Anakin and resolving an attack under direct prevention.

The conversion group adds six definitions, bringing JTL coverage to 260/266 and
registry coverage to 1,448. Poe can pilot the X-Wing he creates. Sidon applies
negative upgrade modifiers to an enemy Vehicle. Phantom II docks to The Ghost,
keeps its text in upgrade form and waits for any attached upgrade's defeat
replacement before completing conversion.

Conversion restrictions retain either an exact host or the printed host filter.
They survive reattachment and clear on detachment or leaving play. The attaching
Pilot does not count itself against the host's no-Pilot restriction. Pantoran's
separate detach trigger returns the former host to its owner; ability loss can
suppress that trigger. Death Star Plans fixes the attacking seat and gives that
player the new-host choice. Sweep selects both units before simultaneous return.
Six corresponding continuation cases join the shared recovery workload.

The keyword group adds Yularen and The Ghost, bringing JTL to 262/266 and
registry coverage to 1,450. Yularen records the resolving player and exact source
incarnation. His grant survives control changes and ability loss; capture or
another departure ends it permanently. Later Vehicle plays receive Shielded.
The Ghost derives only current keyword abilities for other friendly Spectres,
including numeric values, Bounty rewards, and alternative-cost keywords. Query
scoped dependencies bound sharing cycles. Recipient and source ability loss apply
at their respective boundaries. Two more continuation cases cover the keyword
choice and a later Vehicle play.

The defeat group adds L3-37 and Shadow Caster, bringing JTL to 264/266 and
registry coverage to 1,452. A serializable unit-defeat group offers replacements
before committing its remaining simultaneous deaths. L3 retains her incarnation,
cleans damage and upgrades, and keeps her host restriction. Nested upgrade
replacement choices finish before conversion. Replacing an Exploit defeat pays
the cost without inventing a unit-defeat event.

Shadow Caster repeats the whole captured When Defeated group. Printed and granted
abilities retain their exact source, controller, original combat context and
usage limits. The observer can leave in the same event; a later incarnation does
not replace the historical ability. Five continuation cases cover these choices.

The payment group completes **266/266 JTL cards**, with 1,454 definitions in the
registry. The Starhawk halves the resources needed to satisfy a determined cost,
rounding up after increases and discounts. Card and ability costs, Exploit,
Credits and Droid payments share this rule; resource-count requirements and
non-resource costs remain intact. Separate per-unit payments round separately.

Jump to Lightspeed returns the chosen upgrades and their host together, before
checking lost HP. Owners receive their cards; unreturned upgrades still resolve
defeat replacements. Departure abilities retain their pre-return origins, even
when returning a leader unit becomes a defeat. The next matching unit play offers
free or normal payment and consumes the grant either way. Cancellation restores
the declaration, and unused grants expire with the phase. Free play still permits
Exploit and triggers When Played abilities. Seven more continuation cases cover
attachment return, free/normal choices, Exploit and reduced payments, bringing the
shared replay and fresh-process recovery workload to 350 cases.

At the completion of JTL, the pins were engine `crossfire-0.123.0`, state `107`, cards
`crossfire-core-122` and browser protocol `36`. Only the newest committed
executable is kept during unreleased development. The canonical inventory is
checked against the official SWUBASE catalog; dedicated card tests check actual
play, attack, payment and target outcomes.
