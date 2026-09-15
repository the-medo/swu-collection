# Search continuations and phase damage

Captain Rex, the Invisible Hand, Jabba and Retaliation each have their own
registered definition. Printed text and catalog rulings are pinned in
[the fixture](../../play/testing/fixtures/meta-post-search.json).

The official formatted text for
[Captain Rex](https://admin.starwarsunlimited.com/api/card/details/39615?locale=en)
and [the Invisible Hand](https://admin.starwarsunlimited.com/api/card/details/19916?locale=en),
verified on 2026-09-09, clarifies their older “completes an attack” wording.
Their attack-end abilities require surviving that attack. The engine records
survival after attack modifiers expire and immediate defeats are maintained,
then carries that value in the serialized trigger context. Rex grants Sentinel
to himself and one enemy unit for the phase; lacking an enemy still grants his
own Sentinel.

A single-card search can now draw its selected card and continue with effects
bound to that exact card. The Invisible Hand privately inspects the top eight,
may find no eligible Droid, reveals and draws its selection, then optionally
plays a Droid unit costing at most two for free. Declining keeps the card in
hand. The existing search remainder is still randomized by the server and put
on the bottom. The follow-up unit restriction also excludes alternate Pilot play.

Single-upgrade selections retain both a group and an exact target binding.
Jabba returns an upgrade to its owner's hand and offers a free play only if it
is in his controller's hand. Enemy-owned cards and departing tokens cannot be
played through that continuation. Returning and replaying creates a new rules
incarnation. Both the return and the free play are optional; Restore 2 remains
an independent attack ability.

Actual positive base damage records unit source references for the current
phase. Retaliation can choose either player's eligible unit, including a leader
unit or a source of non-combat ability damage. Event damage does not make a unit
eligible. The history survives source departure, but a replayed incarnation
cannot inherit the old reference. Phase changes clear it. Scenario inputs can
seed the history through validated `dealtBaseDamageThisPhase` aliases.

[Eleven outcome scenarios](../../play/testing/meta-post-search.test.ts) cover
optional branches, controller/owner differences, exact copies, phase expiry,
private search projection and fresh-process search/free-play/target recovery.
The complete-game gate now also covers Roseville's winner; six complete winner
lists have implemented main decks and sideboards. Deck admission still rejects
all remaining unsupported cards and roles.

## Top 8 search and combat choices

Faith in Your Friends uses an explicit unrevealed search result. Only the
chooser sees the inspected cards; drawing does not reveal the chosen identity.
Its separate Disclose effect remains available after finding nothing. Putting
a Team Together uses an any-listed-aspect unit filter, while the Master
Codebreaker searches any card kind with the Gambit trait. All retain server
randomness for the unchosen remainder and exact-card recovery.

Attack-bound effects can explicitly allow an exhausted attacker and enqueue
effects after that attack. 4-LOM permits the former while excluding base
targets. Tandem Assault offers its ground attack only after the space attack
and its pending triggers finish. A selection made solely for an attack uses
`forAttack` to exclude units that cannot perform it. Loth-Wolf's prohibition
applies to normal, granted and Ambush attacks; losing its abilities removes
the prohibition. Independent effects before a possible attack, such as the
T-6 Shuttle's bonus, still resolve on an otherwise eligible Loth-Wolf.

Hold Them Off carries the selected unit as the damage source through allocation.
Helgait snapshots its last-known power for an optional, complete Advantage
distribution. Dismantle the Conspiracy validates the entire selected group
against one remaining-HP budget before capturing that group and performing
state maintenance. The Wrong Ride lets its caster choose any two opposing
resources, including already exhausted ones.

[Seventeen outcome scenarios](../../play/testing/top8-search-combat.test.ts)
cover these choices, restrictions, privacy and fresh-process recovery. Four
additional shared continuation cases cover unrevealed search, capture, attack
sequencing and last-known-power allocation.
