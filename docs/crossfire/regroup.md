# Regroup timing and return effects

The action phase expires before the regroup phase begins. At regroup start,
Crossfire captures all effective `regroup-start` abilities with their current
controllers and ability origins. Due delayed effects then resolve before those
triggers (supplied v8 §§5.5.1a, 7.7.4b). A unit that leaves play during a delayed
effect can still resolve an ability that already triggered. New defeat triggers
join the pending trigger window. Both kinds finish before drawing, resourcing
and readying.

## Preparing resources together

During setup and ordinary resourcing, both players receive a private resource
choice once the two consecutive resource steps reach the front of the queue.
The second player can wait for the initiative player's choice, or confirm early.
An early confirmation stores exact card incarnations on that player's resource
frame; it moves no cards and emits no facts. The initiative player's and
spectators' views do not change. The second player can cancel and choose again
until the first choice resolves.

Resolution retains initiative order. When the second frame reaches the front,
the engine validates the queued choice against the current hand, then executes
the ordinary resource operation. If preceding work invalidates it, the player
gets a fresh choice instead. The frame is journaled and checkpointed with other
engine state, so reconnects and worker recovery retain an early confirmation.
Setup still requires two cards; regroup still permits zero or one. No early
choice is offered across intervening effects, mulligans or other work.

If both confirmations are in flight when the initiative player's command commits,
the same connection can still submit its immediately preceding early offer. This
handoff requires the exact next engine revision, unchanged resource frame and
selection bounds/handles, and matching previously offered option. Other stale
commands still require resynchronization; no later round can reuse the offer.

`resource-plans.test.ts` covers privacy, cancellation, illegal choices, setup,
regroup, and fresh-process recovery. The WebSocket integration suite verifies
private confirmation followed by worker restart and ordered completion.

`delayedEffects` supports exact-incarnation defeat and return-to-hand at regroup.
The original ability controller orders their effects, with the active player
choosing whose group resolves first when necessary. A return uses ordinary
protection, leader/token handling and attachment cleanup. Source movement or a
later control change does not cancel it; a new unit incarnation does not inherit
it. Checkpoints validate the source definition's scheduling capability.

Commandeer selects a non-leader Vehicle of printed cost at most six with no
attached card currently having the Pilot trait. Taking control successfully
readies the unit unless it cannot ready. Its separate delayed return also applies
when choosing an already friendly unit; that choice does not ready the unit.
The return always goes to the owner's hand. Commandeer's official JTL 235
clarification requires the unit still to be in play.

Alphabet Squadron U-Wing gives one Advantage to any chosen unit at regroup start.
Shadow of Stygeon Prime grants its host the regroup damage ability, so that host's
controller deals two damage to their own base. The upgrade's direct prohibition
on readying survives the host losing abilities. Blanking the upgrade removes both
its direct prohibition and its granted ability. Attachment legality uses runtime
leader status. The shared recovery workload includes ordering a delayed return
and defeat before a captured regroup trigger; card tests cover departed sources,
changed control, new incarnations, named ability loss and exact public references.

## Next action-phase delays

The Eye of Aldhani schedules `effects-at-action` for the next round. This
variant has no unit target and stores the original event/controller plus the
serializable effects. At action start, phase history resets and ordinary start
triggers are captured; due delayed effects resolve before those triggers and
before the first action. Existing regroup delays retain their separate timing.
Multiple delays use the existing controller/batch ordering rules.

`unit-tax` captures the affected controller's units at resolution. Its separate
chooser selects units to pay for, bounded by ready resources plus Credits.
Nonselected units exhaust together after all choices and payment are fixed
(v8 §8.34); selecting an already exhausted unit never readies it. Leaders in
unit form count, Pilots as upgrades and captured cards do not. The optional
Credit payment retains and validates the whole unit selection across recovery.
The browser displays global schedules and gives payment controls only to the
payer. Public source/unit references never disclose hidden resource identities.

`meta-action-delays.test.ts` covers timing, simultaneous exhaustion, Credits,
multiple copies, runtime roles, privacy and fresh-process continuation.
[The Eye of Aldhani](https://admin.starwarsunlimited.com/api/card/details/39740?locale=en).

## Temporary control and the next regroup ready step

`take-control.returnWhen` creates an exact-copy control return after a successful
transfer. `control-at-regroup` resolves at the next regroup start;
`control-on-departure` waits for the creating source incarnation to leave play.
Both use the same controller ordering as other delayed effects. They restore the
unit's owner, preserve damage and exhaustion, and do nothing to a later copy.
A source-leave duration cannot be established after that source already left
(v8 §7.7.4f). Maul checks actual combat damage to the opponent's base and his
survival before offering a target. Liberated by Darkness first requires Force use.

The scheduled source is the ability's holder. A borrowed trigger separately
retains its printed ability origin, including after attack grants expire. Thus
Maul borrowed through Support returns control when the attacking holder leaves,
not when the unit that lent its ability leaves. Checkpoints validate the retained
origin and scheduling capability. Pending departure returns resolve before the
next waiting action/effect or trigger batch. The browser's scheduled list includes
both return timings in protocol 23.

After reattachment or host control changes, token upgrades take their host's
controller as their owner and controller (§1.5.2f).
Ordinary upgrades retain their existing ownership and control. Historical token
ability sources keep their original snapshots; current attachment ownership is
validated against the current host controller. An explicit instruction can take
control of a token while it remains on an enemy host; its owner still follows
that host. Shuttle ST-149 exercises this exception before reattachment.

Dryden's power bonus freezes the current attack power, including Raid, when his
optional ability resolves. His separate `next-regroup` lasting effect skips only
the ordinary ready step of that regroup. It does not prevent another card from
readying him. Declining creates neither effect, and a later incarnation does not
inherit either effect. `top8-control.test.ts` covers these outcomes, multiple
returns, changed ownership, departed sources, borrowed origins and recovery.


## Extra actions and additional regroup phases

Kazuda Xiono, Best Pilot in the Galaxy uses separate leader, unit and upgrade
abilities. His leader action grants an extra action even when there is no
friendly unit to blank. The selected unit loses abilities until the round ends;
that duration survives Kazuda leaving play or changing roles and suppresses
later ability grants. His unit and Pilot-granted On Attack choices blank any
number of friendly units simultaneously, including the attacker itself.

Extra actions live on serialized action continuations. Payments and nested
choices retain the counter, and any standard action can use an extra action.
`lastPassPlayer` distinguishes two passes by the same player from consecutive
passes by both players. Taking initiative still forces that player to pass all
remaining actions. These fields remain private engine state.

Max Rebo, Encore! contributes one extra regroup per active copy when the first
regroup ends. The continuation captures the remaining count and repeats every
regroup step without incrementing the round: start abilities and delays, drawing,
optional resourcing, readying and phase expiry. Once-per-round uses remain spent;
next-regroup ready suppression expires after its one applicable regroup. Round
ability loss remains through all regroups, then expires before the next round.
A round-blanked Max contributes no extra regroup. A phase-blanked Max regains his
ability when that phase expires.

`top8-turns.test.ts` verifies both leader roles, extra passes, complete repeated
regroups, multiple Max copies, phase/round expiry and checkpoint recovery.
The pinned official clarifications are in `play/testing/fixtures/top8-turns.json`.


## Delayed victory

Confidence in Victory is legal only as its controller's first normal Play a Card
action in an action phase. Each player's completed action count is separate and
resets at the next phase. An extra action is still a later action; an effect that
plays a card cannot bypass this restriction, even before the first action finishes.
Credit payment continuations preserve the original normal-action context.

The selected arena becomes public on a `victory-at-regroup` schedule. At the
first regroup start, the original event controller wins only if at least one
friendly unit and no enemy unit occupies that arena when the delay resolves.
Empty arenas do not qualify. Existing delayed-effect controller/order choices
apply, before ordinary regroup triggers. A failed condition is consumed and Max
Rebo does not retry it. The event leaving discard does not cancel the schedule.

This win ends the game with result reason `card-effect`, clears remaining
continuations and logs the exact source event without damaging either base.
Browser protocol 24 carries the result and selected arena. The board displays
the arena next to the scheduled ability. `top8-victory.test.ts` covers normal
and nested admission, opposing victories, delayed defeat ordering, recovery and
player/spectator projections. Card text and the explicit play restriction ruling
are pinned in `play/testing/fixtures/top8-victory.json`.
