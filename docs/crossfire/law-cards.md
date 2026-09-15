# A Lawless Time card conformance

LAW coverage uses canonical identities with a LAW printing in the tracked
SWUBASE catalog; reprints retain their original implementation path. Each card
has a dedicated definition and an explicit registry entry. The LAW fixtures
pin the catalog text and the separately fetched official text/rulings where
they differ. They do not silently update the application catalog.

`law-foundations.test.ts` exercises entry keywords, legal attacks, damage,
healing, tokens and continuous bonuses through engine decisions. Fulcrum's
printed stat modifiers and direct Rebel trait belong to the upgrade; its
other-friendly-Rebel aura is an ability gained by its host. Host ability loss
removes that aura while retaining the direct upgrade effects.

Under the pinned v8 rules (§7.5.5), Ambush permits an exhausted unit to attack
an enemy unit. It does not ready the attacker. The LAW Ambush regressions place
a readying observer at the pending attack to ensure the keyword cannot
incorrectly trigger The Conflict Within.

`law-effects.test.ts` covers the LAW play/attack/defeat triggers, searches,
Credits, token assignments and phase grants. Multi-card searches retain their
selected references while each card's play and entry effects finish. The L3
scenario resumes in a fresh process between selected plays. Mandatory target
choices remain mandatory after an optional earlier instruction, including
Rickety Quadjumper's Experience after revealing a non-unit. An empty reveal
cannot satisfy that condition. Base choices and unit control are independent:
Cassian can damage either base, and Rhydonium lets each chooser return a unit
controlled by either player.

LAW history and phase effects use state schema 92. Discard history records the
owner, origin zone and discarded incarnation. Printed discard actions are
available only in their declared zone, after their condition is met, and when
the nested play can change state. Salvaged Blaster pays the normal play cost;
its permission expires with the phase. A played card records the number of
actual resources paid separately from Credits. Changing arenas retains that
payment record; leaving play does not transfer it to a later incarnation.

Lasting effects represent temporary attack protection, combat damage prevention
and healing prevention. Ben Solo's restriction permits attacks against a
Sentinel, as specified by the official ruling. Combat prevention leaves power
and non-combat abilities intact. Base healing routes consult the same phase
restriction, including Restore and direct healing. Enemy defeat observations
include the departing unit while the simultaneous board still exists, allowing
Dengar to compare tied highest costs before removal.

The LAW continuation corpus covers opponent-owned mode choices, numeric target
counts, discarded event triggers, paid discard actions and healing restrictions.
It is included in checkpoint/view equivalence and the current executable's
fresh-process recovery verification.

The interaction batch uses state schema 93 and view protocol 34. Control
exchanges validate both units before changing either controller. A defeated
unit can become a resource under its last controller while retaining its owner.
Rio's returned-card play decision belongs to that owner; the original ability
controller remains separate. Damage continuations record damage actually dealt
after prevention, so Choke cannot heal from prevented damage or a defeated unit.

Attack completion effects wait for attack-end triggers. Regroup operations pin
the played card's incarnation: Salvaged Materials defeats its Item upgrade,
while Maz bottoms the searched unit without treating the move as a defeat.
Both operations remain valid after the ability source leaves play. The LAW
interaction tests and shared continuation corpus cover these choices and delays.

The complete LAW scope is 267 canonical identities with at least one LAW
printing. All 127 definitions that were missing at the start of this work are
implemented, bringing the registry to 1,006 definitions. `catalog.test.ts` pins
that complete set as well as each new card's official text and rulings.

State schema 94 records when continuous printed-stat replacements become active.
Obi-Wan's seven-unit condition and Adventurer Sniper Rifle apply the latest
active replacement before adding upgrade and other stat bonuses. Falling below
seven units removes Obi-Wan's activation; satisfying it again gives a new order.
Departures retain both effective and replaced printed stats. Reading stats or
projecting a view never changes this history.

Malakili grants traits by control to units in play and by ownership to unit
cards outside play, including the facedown fronts of resources (v8 §4.9.1).
Granted traits participate in searches and cost filters, and disappear when
his ability is lost. Hunter's action uses the activating player's Credit
payment without prematurely changing the source unit's controller.

Hondo's top-deck permission is a separate private field in view protocol 35.
Only the controller receives the current face and opaque handle, regardless
of hand-reveal settings. The board allows that player to inspect it at the
deck. His action is unavailable when the card cannot be played; a legal play
pays its normal cost and consumes the round use.

Fire Across the Galaxy snapshots a finite pool of explicit When Played
abilities on friendly Spectres. Keyword-generated entry abilities are excluded.
Each offered ability can be used once, in the chosen order, with nested
resolution completed before returning to the pool; the player may stop early.
Vermillion reveals one exact top card, separates its owner from the chosen
player who may play it, and compensates the other player only after a play.

`law-final.test.ts` covers these interactions, including optional branches,
source/recipient ability loss, foreign events and upgrades, private projections
and fresh-process recovery. The shared corpus now contains 276 suspension cases.
