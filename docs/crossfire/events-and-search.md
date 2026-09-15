# Crossfire events, attack duration and private searches

Events are admitted as main-deck cards. Playing an event pays its aspect-adjusted
cost and moves the exact card from hand to discard before resolving its effects.
It never enters play. An event may be played even if no effect has an eligible
target; paying and discarding it still changes the game state. Its event-time
source reference remains available for damage logs and exact-copy hover.

Aggressive Negotiations (SEC 179), Surprise Strike (SOR 220), and Open Fire
(SOR 172) each have a dedicated definition. The first two initiate an attack with
a ready friendly unit. Sentinel and arena restrictions still apply. Aggressive
Negotiations counts the remaining hand at attack declaration, after the event
has left hand. Later draws/discards do not change this bonus. Surprise Strike
adds three power. Open Fire deals four damage to a unit, including friendly units.

`attacks` retains exact attacker/defender references and a fixed bonus for each
active attack scope. Serializable combat and end-attack frames reference that
scope. Nested scopes have separate IDs and finish in reverse order. Current unit
power includes matching active attack modifiers. If a unit leaves play during
combat, departure statistics include its bonus. The scope expires before
post-combat defeat triggers resolve, even when no combat damage was possible.
Ending the game discards outstanding scopes and execution frames.

Checkpoints validate attack references and their matching end-attack frames.
Tests cover event payment/discard, ineffective events, legal attacks, Sentinel,
bonus calculation, mid-Shield fresh-process recovery, expiry before nested
triggers, early game ending, event source references and every-input replay.
The rules basis is supplied v8 §§3.3, 6.3, 7.4, 7.6.8 and 7.7.3. The stored card
clarification for Aggressive Negotiations confirms when its bonus is counted.

This establishes event execution and attack-duration modifiers. Phase modifiers,
attack-end trigger cards and modified play modes beyond the unit play below
remain separate engine work. Current version pins and
commands are in the [engine guide](engine-core.md).

## Private top-deck searches

Recruit (SOR 123), Remnant Reserves (SHD 093), and Greef Karga, Affable Commissioner
(SHD 245) use one shared `search-deck` effect. It specifies how many top cards
to inspect, a unit/upgrade filter, and a maximum selection count. Only the
searching player receives `decision.inspectedCards`, including nonmatching cards.
Selection handles address exact eligible copies. The player may find nothing
even when there is a match (v8 §8.26), while duplicate, excessive, out-of-range
and wrong-kind selections are rejected. Searches of an empty deck do not cause
draw damage.

A `search` frame retains the inspected references and private choice. A
`search-shuffle` frame retains the selection and requests server randomness for
the unchosen remainder. The host drains this request before accepting progress.
Only that remainder moves to the deck's bottom in randomized order; uninspected
cards retain their order. The selected cards are revealed and drawn, with exact
references in public reveal and private draw facts. Searched cards never enter
play during inspection. The remainder's viewer handles rotate even when its
random order happens to be unchanged.

Other players and spectators see neither the inspection panel nor private
looked-at facts, including when both hand-reveal policies are enabled. A public
reveal label does not link to the card's current hidden hand slot. The searching
player's visible hand can resolve that reference. Checkpoints compare canonical
reference fields, validate the inspected deck prefix, selection and random
bounds, and recover both the player choice and shuffle in a fresh process.

Tests cover empty/short decks, no-match and failed-to-find searches, multiple
selection, source-unit triggers, malicious choices/checkpoints, differential
secrecy, exact-copy handles, random-provider failure atomicity and every-input
replay. Later search continuations and whole-zone searches are described below and
in [search continuations](search-continuations.md). New search destinations and
filters still require explicit mechanics and conformance cases. The rules basis is supplied v8 §§1.17, 8.25 and 8.26.

## Modified unit play and delayed defeat

Sneak Attack (SOR 219) pays its own event cost and then offers affordable units
from its controller's hand. Its pinned catalog text reduces the chosen unit's
cost by three. The reduction applies to the aspect-adjusted cost, to a minimum
of zero. The unit enters ready. Normal play legality, uniqueness and nested
When Played abilities still resolve before the opponent takes an action. An
ineffective event still pays its cost and moves to discard. The controller may
also decline the hidden-hand play even with an eligible card (v8 §7.1.6a).
This option was corrected in engine 0.9.0.

`delayedEffects` records the source snapshot, controlling player, exact target
incarnation and regroup round. The originating event may leave discard without
cancelling the effect. A unit that leaves play and returns has a new incarnation,
so the old effect cannot defeat it. At the start of regroup, due effects move
into a serializable `delayed-batch`. The initiative holder chooses whose batch
resolves first; each controller orders all their effects before the other
player's batch. These immediate effects resolve before regroup's draw step.
Defeats use normal maintenance, including attached upgrades and defeat triggers.
Shield does not replace defeat. Future-round effects remain scheduled.

The view exposes scheduled effects and ordering options with opaque handles and
historical source/target labels. Current-card links require the same visible
incarnation. Scenario entries can seed a delayed effect using source and unit
aliases. Checkpoints validate source/target identity, ownership, unique effect
IDs and timing. Tests cover payment, ready entry, nested Shielded and uniqueness,
regroup ordering, attachment cleanup, leaving/reentry, source movement,
fresh-process continuation, secret-differential projections and every-input
recording replay. The rule basis is supplied v8 §§6.2, 7.6.8, 7.7.4 and 8.11.

The current delayed handler is defeat at the start of regroup. Other conditions
and effect kinds need explicit handlers and conformance cases before admission.

## Searching a whole deck and hand

Annihilator's played/defeated abilities use `search-zones` after an actual unit
defeat. The bound unit reference resolves its former controller from departure
history; returning the physical card to its owner's discard does not change
whose zones are searched. Matching uses the official title without subtitles.

A serializable `zone-search` frame holds the complete ordered inspection of the
specified deck and hand. Only the searching player sees those faces and legal
selections. V8 §8.26.6 allows hidden matches to remain unrevealed, so selection
may be empty or a subset. Selected copies move to discard with public exact-copy
references. Searching the whole deck always schedules its normal server-owned
shuffle, including failed searches; shuffled card handles rotate.

Checkpoint validation checks the zone owner and every inspected reference in
order. Card tests cover other subtitles, stolen units, departed sources,
protected units, leaders, tokens, failed searches, hidden-view differences and
fresh-process recovery. The shared executable recovery workload includes both
the search choice and the subsequent full-deck shuffle (v8 §§8.26.2, 8.26.6).

## Temporary opponent play from discard

Stolen AT-Hauler grants its controller's opponent permission to play the exact
card from its owner's discard pile for free during the current phase. With two
seats there is one opponent. `grantedPlays` stores the recipient, source snapshot,
card reference and phase/round. Legal actions, resource/Credit payment and unit
entry all use this permission; it does not make other discarded copies playable.
The new unit enters exhausted under the player who played it, with ownership
unchanged. Play prohibitions still apply.

Moving the card cancels its permission, including moving through a hidden zone
and back to discard without reentering play. Phase transitions clear permissions.
A player who has taken initiative cannot take the play action, and a permission
created during regroup cannot carry into the next action phase. The source's
ability must exist when defeated to trigger, but later ability loss cannot undo
a permission already resolved. The shared recovery workload resumes the free
play decision; card scenarios also cover repeated theft, Credits, exact copies,
phase expiry, public discard references and malformed checkpoints. The official
JTL 221 clarifications explicitly confirm the free-play and timing restrictions.

## Opponent searches and computed counts

A `search-deck` effect may select the opponent as its searcher. The source and
ability controller stay unchanged in the frame; decision ownership, private
inspection, deck access, reveal and draw use the searching player. Search counts
can use named numeric values, optionally scaled by a multiplier, and resolve to
an integer in the frame before inspection. Searching zero cards creates no
inspection or shuffle suspension. Unit, upgrade and event filters are supported.
Opponent searches that directly play cards remain explicitly unsupported.

Elzar's tests cover zero and partial token distributions, both leader faces,
private event choices, failed-to-find searches, untouched deck remainders,
malformed choices and fresh-process recovery through the server shuffle.

Searches may constrain printed arena, total printed cost, or an exact attachment
host. `search-deck` preserves its source context through inspection and shuffle;
Reforge's host binding therefore survives both boundaries. The host is checked
again before play, including its incarnation. Removing an HP-granting upgrade
can defeat that host before the search finishes.

A search that plays several cards stores the chosen references in the existing
`play-card` effect's group. The controller chooses the next legal play; nested
triggers and uniqueness finish before the remaining group resumes. Search
restrictions apply to each modified play (v8 §8.26.8); Ackbar's space units cannot
instead be played as Pilots. Free play ignores resource costs and aspect
penalties. Discounts retain ordinary payment. Selected cards remain outside the
ordered deck but in its zone, with explicit cleanup continuations returning any
unplayable cards to the bottom. Other viewers see selected reveals, never the
unselected inspection or server shuffle order.

Actual draw events share `recordDraw`, including selected cards moved to hand by a
search. The public count and private card references are recorded together before
collecting draw observers. A multi-card draw triggers once; drawing zero cards
triggers nothing. Trigger definitions may have conditions checked when the event
occurs. The Mandalorian, Let's See the Puck uses an action-phase condition to grant
one Shield for each draw event, including his own When Played draw. Regroup draws
and merely returning or moving cards to hand do not grant Shields.

## Looking and ordering

`look-deck` uses an `arrange-deck` continuation, separate from search and its
random bottom remainder. Qui-Gon Jinn, Influencing Chance privately looks at three
cards, may discard one, and chooses the remaining top order. Rogue One, At Any
Cost looks at two cards after each friendly unit defeat, including itself. Its
controller chooses which cards go to the bottom and orders each resulting group.
Simultaneous defeats capture Rogue One's origins before any unit leaves play.

The frame retains the inspected deck prefix, chosen bottom group, and partial top
and bottom orders. Multi-card orders use explicit successive choices; a single
remaining card has a forced position. The ordered deck changes only after those
choices finish. A discard becomes public immediately; inspection and order choices
remain private. Completing the rearrangement rotates inspected visibility handles
so earlier reveals cannot track cards through a private order change. No shuffle,
draw event or fatigue is involved, including empty and short decks.

The projector uses private inspected faces and ordinary target options with clear
ordering instructions. Checkpoints validate the inspected prefix, unique order
members, group membership and stage; fresh-process cases cover discard selection,
top order and bottom order.
