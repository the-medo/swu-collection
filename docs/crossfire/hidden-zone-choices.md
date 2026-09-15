# Hidden-zone choices and divided damage

The v8 baseline distinguishes the player choosing a discard from the player who
owns that hand (§1.14). Divided damage is simultaneous, must allocate its full
amount when used, and may exceed a unit's remaining HP (§8.4.5). The printed text
for this batch is pinned in
[meta-hidden-zones.json](../../play/testing/fixtures/meta-hidden-zones.json).

## Inspection ownership

`inspect-zone` saves a `zone-inspection` frame with the source controller, zone
owner, chooser, inspected card references, selection filter and continuations.
It supports hand, discard-pile and resource inspection with a bounded number of
selected cards; required selections do as much as possible from a short zone.
Checkpoint validation verifies those participants and the exact current zone
contents. The chooser alone receives the inspected faces and selection handles.
Looking at an opponent's hand or resources creates a private log fact for that viewer; it does
not create a persistent reveal of the opponent's current or future hand.

A filtered selection still permits its authorized viewer to see every inspected
card. The browser shows ineligible inspected cards separately from the selection.
Beguile uses a zero-selection inspection followed by its mandatory unit choice.
Ninth Sister gives the opponent their own discard choice, then returns the
subsequent damage decision to the ability's controller. Hold for Questioning
lets that controller inspect the hand and choose a shared-aspect card.

## Moving cards

`move-card` checks the bound copy's current zone before moving it. Discarded
cards enter their owner's discard pile; recovery and deck placement preserve
physical identity while invalidating hidden-zone view handles. Trask Walker's
mode chooses hand recovery or bottom placement followed by healing. Milling
moves top-deck cards directly to discard and reveals them publicly; it does not
apply empty-deck draw damage.

`unit-to-deck` gives the chosen unit's owner the top/bottom choice. It removes
attachments through normal departure maintenance, clears damage, excludes leader
cards, and puts tokens in set-aside. Printed-cost comparisons use the bound
card's definition, independently of play discounts and aspect penalties.

## Divided damage

`allocate-damage` uses the existing numeric allocation interface. Unlike indirect
damage, it targets the specified units and gives each the entire amount as its
maximum. The server rejects incomplete allocations, excess totals, ineligible
cards and forged handles. Declining an optional allocation requires an empty
selection. The chosen damage resolves simultaneously through normal replacement
choices, so Shields can prevent it. Attribution stays with the original source.

## Validation

Fifteen scenarios in `meta-hidden-zones.test.ts` cover every new definition,
optional and failed branches, exact-copy movement, filtered choices, private
replacement draws, divided damage and fresh-process continuation. Secret-
differential tests compare views that differ only in an unauthorized hand.
The connection test checks declining divided damage with no allocation.

The authenticated browser fixture supports `CROSSFIRE_BROWSER_SCENARIO=inspection`.
With the running local worktree's `CROSSFIRE_TEST_DATABASE_URL`, run
`bun run play:browser:test` to exercise hand inspection, a reload during that
choice, private replacement draws, spectator consent and a complete game.

## Playing an opponent's resource

Tear This Ship Apart inspects the ordinary resource list, excluding public Credit
tokens, and optionally binds one exact card. The subsequent `play-card` effect
allows a free play with `takeControl`. Legal choices evaluate unit/upgrade/Piloting
roles and attachment restrictions under the acting player's control; the actual
card retains its original owner. Named play restrictions still apply. Free play
waives resource costs and aspect penalties. Unknown cards remain unsupported.

Units and upgrades enter under the acting player's control. An event goes to
its owner's discard pile (v8 §6.2.5c), while a captured source snapshot preserves
the player resolving its ability. This also applies when that event schedules
future work. After the modified play's effect resolves, the opponent resources
their top card exhausted; this is the existing `resource-top` primitive extended
with a recipient. Unlike Smuggle, this replacement is conditional follow-through
rather than simultaneous entry. An empty deck causes no fatigue. Declining or
failing to play does not replace a resource.

Inspection and the selected card's play choices remain private until actual play.
The browser can display the inspected face without exposing it in public zone
cards, logs or spectator decisions. `meta-resource-play.test.ts` covers all play
roles, ownership, restrictions, delayed stolen events and fresh-process recovery.
[Tear This Ship Apart details](https://admin.starwarsunlimited.com/api/card/details/46382?locale=en).

## Top 8 grouped choices, deck ownership and random discard

`inspect-zone.group` retains every selected exact reference. `move-cards` applies
one simultaneous discard to that group and records the responsible player.
Luthen's Haulcraft requires two cards when available; Profundity compares the
remaining hand counts after its first discard before requesting another.

`look-deck` separates the inspecting player from the deck owner. Only the
inspector sees the top card, and reordering operates on its owner's deck.
Night Trooper can inspect either deck; discarding the opponent's top card does
not count as that opponent discarding their own deck card. BoShek's Pilot face
mills two cards simultaneously and returns the odd printed costs, including
both if eligible. Zero is even, and a short deck incurs no draw damage.

`random-discard` retains the owner's exact ordered hand and a server random
request. The Will of the Force includes the just-returned unit among the
possible outcomes; stolen units still return to their owner's hand. Clients
receive neither that hand nor the private execution frame. Checkpoints validate
the complete retained hand before accepting random input.

`reveal-hand` publishes a point-in-time reveal and can count a named title.
Inspector's Shuttle counts all matching titles regardless of subtitle, then
grants that many Experience tokens. Ebon Hawk's aspect modes use Disclose and
attack-duration modifiers; the official styled text restricts the penalty to
the defending unit. Source text is pinned in `top8-hidden.json`; outcome tests
cover privacy, short zones, optional branches, exact ownership and fresh-process
recovery. These mechanics also join the shared executable recovery workload.

## Required top-deck discards

`look-deck.minDiscard` distinguishes a required discard from the existing optional
one-card choice. The `arrange-deck` continuation retains that minimum, bounded by
the number of inspected cards. The server rejects a zero-card response when one
is required. A short deck requires its remaining card; an empty deck skips the
inspection without drawing or fatigue. Only the choosing player sees inspected
faces; the discarded card becomes public, and private rearrangement changes the
remaining cards’ visibility counters. Sabé exercises mandatory top-two inspection
and recovery while earlier optional inspection cards retain their zero minimum.
