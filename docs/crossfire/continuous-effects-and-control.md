# Continuous effects, control and Hidden

The printed text for this batch is pinned in
[meta-continuous.json](../../play/testing/fixtures/meta-continuous.json).
The supplied v8 rules define constant-effect dependencies (§7.3.3a), keyword
loss (§8.14), control changes (§8.27) and Hidden (§7.5.18).

## Continuous evaluation

Card definitions declare filtered `auras` for other units and conditional or
calculated modifiers for themselves. Evaluation carries a query-local dependency
set through conditions, unit filters and numeric values. A modifier cannot
establish its own prerequisite through a cycle. Vonreg therefore cannot gain
Raid merely because that same Raid would bring its attacking power to six.
Only candidate aura holders are expanded, avoiding a full origin snapshot of
every card for every stat query.

Resolved origins retain the printed or upgrade-granted profile, exact source
copy and aura ID. Granted triggers keep those origins when collected, including
when the aura source and recipients are defeated simultaneously. A Support
borrower evaluates a borrowed aura relative to itself. Keyword loss suppresses
both printed and granted copies of the keyword; dependent effects then
recalculate. Normal maintenance processes resulting HP reductions and defeats.

## Ownership and control

`take-control` changes the unit's controller while preserving its incarnation,
damage, readiness and attachments. Ordinary attached upgrades keep their own
controllers. Token upgrades take the new unit controller as both owner and
controller (v8 §1.5.2f); historical ability sources keep their captured snapshots.
Departure resets the card to its owner after capturing its previous controller
and abilities. A defeated ability therefore belongs to the controller at defeat,
while the physical card enters its owner's discard pile.

An attack records participants removed through control changes. Changing control
back does not restore participation. Combat, attacking bonuses and references to
a defending unit respect that record. Checkpoints validate it against the
attack's original exact-copy references.

## Entry history and Pilots

The phase records exact copies played, deployed and created. Hidden blocks attacks
on those units for that phase, unless the unit also has Sentinel. Phase changes
clear entry history. Scenarios can declare `enteredThisPhase` aliases and explicit
unit controllers. Pilot attachment limits use the host's current additional-slot
ability; the Falcon allows two Pilots and separately counts their stat bonuses.
This does not add pilot-leader deployment.

## Validation

Fifteen outcome scenarios cover the twelve new definitions, control and upgrade
ownership, dependent HP loss, Hidden/Sentinel, Pilot limits, Support aura scope,
and fresh-process recovery of control, trigger and attack decisions. The batch
also fixes checkpoint validation of ordinary granted attacks that pause for a
nested choice; only Support origins require the Support exclusion marker.

## Counting different keywords

Gallius Rax gives other friendly units +2/+2 when they have at least two
different keywords. `keywordNames` uses effective ability origins, including
conditional and granted abilities. Raid and Restore count by name regardless
of their number; a present Raid 0 remains a keyword, while a stat-only constant
does not introduce Raid or Restore. Printed Piloting counts on the unit face;
an attached Pilot does not grant that keyword to its host. Support and ability
loss retain their existing origin and suppression rules.

The keyword filter uses the same guarded evaluation as other auras. Losing the
source or eligibility removes the bonus immediately, and maintenance can then
defeat a damaged beneficiary. `top8-restrictions.test.ts` covers these outcomes,
conditional presence, numeric duplication and Pilot roles.
[Official Gallius details](https://admin.starwarsunlimited.com/api/card/details/52182?locale=en)
are pinned in `top8-restrictions.json`.
